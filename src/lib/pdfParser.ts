import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedTransaction, ParseResult } from './fileParser';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface StatementMetadata {
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  statementDate?: string;
  accountName?: string;
  lastFourDigits?: string;
  newBalance?: number;
  minimumPayment?: number;
  dueDate?: string;
  institution?: string;
}

export interface PdfParseResult extends ParseResult {
  metadata: StatementMetadata;
}

/**
 * Extract all text content from a PDF file, page by page
 */
async function extractTextFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y position to reconstruct lines
    const lineMap = new Map<number, { x: number; text: string }[]>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, text: item.str });
    }

    // Sort lines top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const pageLines: string[] = [];

    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      // Join items with spaces, detecting column gaps
      let line = '';
      let lastX = -1;
      for (const item of items) {
        if (lastX >= 0 && item.x - lastX > 15) {
          line += '  '; // Column gap
        } else if (lastX >= 0 && item.x - lastX > 3) {
          line += ' ';
        }
        line += item.text;
        lastX = item.x + (item.text.length * 5); // Approximate end position
      }
      if (line.trim()) pageLines.push(line.trim());
    }

    pages.push(pageLines.join('\n'));
  }

  return pages;
}

/**
 * Date patterns commonly found in bank statements
 */
const DATE_PATTERNS = [
  // Jan 15 or JAN 15
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i,
  // 01/15 or 1/15 (no year)
  /^(\d{1,2})\/(\d{1,2})(?!\/)/, 
  // 01/15/2024
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  // 2024-01-15
  /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  // 15-Jan-2024
  /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})/i,
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parse a date string from a statement line, using statement year context
 */
function parseDateFromLine(text: string, contextYear?: number): { date: string; rest: string } | null {
  const trimmed = text.trim();
  const year = contextYear || new Date().getFullYear();

  // Pattern: Jan 15 or JAN 15
  let match = trimmed.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+(\d{1,2})/i);
  if (match) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = match[2].padStart(2, '0');
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${year}-${month}-${day}`, rest };
  }

  // Pattern: 01/15/2024 or 01/15/24
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    let y = match[3];
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${y}-${month}-${day}`, rest };
  }

  // Pattern: 01/15 (no year)
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${year}-${month}-${day}`, rest };
  }

  // Pattern: 2024-01-15
  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`, rest };
  }

  // Pattern: 15-Jan-2024
  match = trimmed.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2].toLowerCase()];
    let y = match[3];
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${y}-${month}-${day}`, rest };
  }

  return null;
}

/**
 * Extract amount from the end of a line
 */
function extractAmount(text: string): { amount: number; description: string; isCredit: boolean } | null {
  // Match amounts at end of line, optionally with CR/DR markers
  // Handles: $1,234.56, 1234.56, -1234.56, 1,234.56 CR, (1,234.56)
  const amountPatterns = [
    // Amount with CR/DR suffix
    /\s+([-]?\$?[\d,]+\.\d{2})\s*(CR|DR|cr|dr)?\s*$/,
    // Amount in parentheses (negative)
    /\s+\(\$?([\d,]+\.\d{2})\)\s*$/,
    // Just a dollar amount at end
    /\s+\$?([-]?[\d,]+\.\d{2})\s*$/,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      let amountStr = match[1].replace(/[$,]/g, '');
      const isParenthesized = text.match(/\(\$?[\d,]+\.\d{2}\)\s*$/);
      let amount = parseFloat(amountStr);

      if (isNaN(amount)) continue;

      // Determine credit/debit
      let isCredit = false;
      
      if (isParenthesized) {
        amount = Math.abs(amount);
        isCredit = false; // Parenthesized typically means debit in some formats
      }

      const crdr = match[2]?.toUpperCase();
      if (crdr === 'CR') isCredit = true;
      if (crdr === 'DR') isCredit = false;

      if (amount < 0) {
        isCredit = false;
        amount = Math.abs(amount);
      }

      // Extract description (everything between date and amount)
      const descEnd = text.lastIndexOf(match[0].trim());
      const description = text.slice(0, descEnd).trim();

      if (amount > 0 && amount < 1000000) {
        return { amount, description, isCredit };
      }
    }
  }

  return null;
}

/**
 * Lines to skip - headers, footers, summaries, legal text
 */
const SKIP_PATTERNS = [
  /^page\s+\d+/i,
  /^statement\s+(date|period|of\s+account)/i,
  /^\s*date\s+description\s+/i,
  /^\s*date\s+transaction\s+/i,
  /^(opening|closing|previous|new)\s+balance/i,
  /^(total|subtotal)\s+(purchases|payments|debits|credits)/i,
  /^(minimum\s+payment|amount\s+due|payment\s+due)/i,
  /^(credit\s+limit|available\s+credit|cash\s+advance)/i,
  /^(annual\s+percentage|interest\s+rate|daily\s+periodic)/i,
  /^(thank\s+you\s+for|important\s+information|notice)/i,
  /^(fees?\s+charged|interest\s+charged)/i,
  /^\s*\d+\s*$/,  // Just a number (page numbers)
  /^(rewards|points|miles)\s/i,
  /^\*+/, // Lines starting with asterisks
  /^[-=]{3,}/, // Separator lines
  /^(continued|carried\s+forward)/i,
  /^(please\s+note|note:|important:)/i,
  /^(questions\?|customer\s+service|call\s+us)/i,
  /^trans\.?\s*date\s+post/i,
  /^(account\s+summary|account\s+activity)/i,
  /^(your\s+account|account\s+number)/i,
];

/**
 * Keywords indicating a payment/credit transaction
 */
const CREDIT_KEYWORDS = [
  'payment', 'thank you', 'refund', 'credit', 'return', 'reversal',
  'cashback', 'reward', 'reimbursement', 'deposit', 'rebate',
  'adjustment cr', 'cr adj',
];

/**
 * Keywords indicating fees/charges (debits)
 */
const DEBIT_KEYWORDS = [
  'purchase', 'fee', 'interest', 'charge', 'annual fee',
  'late payment', 'overlimit', 'cash advance', 'foreign transaction',
];

/**
 * Determine if a line should be skipped
 */
function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return true;
  return SKIP_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Detect credit vs debit based on description keywords
 */
function detectDirectionFromDescription(description: string, rawIsCredit: boolean): 'debit' | 'credit' {
  const lower = description.toLowerCase();

  for (const keyword of CREDIT_KEYWORDS) {
    if (lower.includes(keyword)) return 'credit';
  }

  // If amount was explicitly marked as credit
  if (rawIsCredit) return 'credit';

  return 'debit';
}

/**
 * Extract statement metadata from the full text
 */
function extractMetadata(fullText: string): StatementMetadata {
  const metadata: StatementMetadata = {};

  // Statement period: "Statement Period: Jan 1 - Jan 31, 2024" or similar
  const periodMatch = fullText.match(
    /statement\s+(?:period|from)[:\s]*([\w\s\d,]+?)\s*(?:to|-|–|through)\s*([\w\s\d,]+)/i
  );
  if (periodMatch) {
    metadata.statementPeriodStart = periodMatch[1].trim();
    metadata.statementPeriodEnd = periodMatch[2].trim();
  }

  // Statement date
  const stmtDateMatch = fullText.match(/statement\s+date[:\s]*(\w+\s+\d{1,2},?\s*\d{4})/i);
  if (stmtDateMatch) metadata.statementDate = stmtDateMatch[1].trim();

  // Last 4 digits
  const cardMatch = fullText.match(/(?:card|account)\s*(?:number|#|no\.?)?[:\s]*[*xX.·•]+\s*(\d{4})/i);
  if (cardMatch) metadata.lastFourDigits = cardMatch[1];

  // Institution detection
  const institutionPatterns: [RegExp, string][] = [
    [/\b(rbc|royal\s+bank)/i, 'RBC'],
    [/\b(td\s+(?:bank|canada))/i, 'TD'],
    [/\b(bmo|bank\s+of\s+montreal)/i, 'BMO'],
    [/\b(scotiabank|scotia)/i, 'Scotiabank'],
    [/\b(cibc)/i, 'CIBC'],
    [/\b(chase)/i, 'Chase'],
    [/\b(wells\s+fargo)/i, 'Wells Fargo'],
    [/\b(bank\s+of\s+america|bofa)/i, 'Bank of America'],
    [/\b(citi(?:bank)?)/i, 'Citi'],
    [/\b(capital\s+one)/i, 'Capital One'],
    [/\b(amex|american\s+express)/i, 'American Express'],
  ];

  for (const [pattern, name] of institutionPatterns) {
    if (pattern.test(fullText)) {
      metadata.institution = name;
      break;
    }
  }

  // Account type detection
  if (/visa|mastercard|credit\s+card/i.test(fullText)) {
    metadata.accountName = metadata.institution
      ? `${metadata.institution} ${/visa/i.test(fullText) ? 'Visa' : /mastercard/i.test(fullText) ? 'Mastercard' : 'Credit Card'}`
      : 'Credit Card';
  } else if (/chequing|checking|savings/i.test(fullText)) {
    const type = /chequing|checking/i.test(fullText) ? 'Chequing' : 'Savings';
    metadata.accountName = metadata.institution ? `${metadata.institution} ${type}` : type;
  }

  // New balance
  const balanceMatch = fullText.match(/(?:new|closing|current)\s+balance[:\s]*\$?([\d,]+\.\d{2})/i);
  if (balanceMatch) metadata.newBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));

  // Minimum payment
  const minPayMatch = fullText.match(/minimum\s+payment[:\s]*\$?([\d,]+\.\d{2})/i);
  if (minPayMatch) metadata.minimumPayment = parseFloat(minPayMatch[1].replace(/,/g, ''));

  // Due date
  const dueDateMatch = fullText.match(/(?:payment\s+)?due\s+date[:\s]*([\w\s\d,]+?\d{4})/i);
  if (dueDateMatch) metadata.dueDate = dueDateMatch[1].trim();

  return metadata;
}

/**
 * Detect the statement year from text context
 */
function detectStatementYear(fullText: string): number | undefined {
  // Look for explicit year mentions near "statement" keywords
  const yearMatch = fullText.match(/(?:statement|period|date)[^]*?(\b20\d{2}\b)/i);
  if (yearMatch) return parseInt(yearMatch[1]);

  // Look for any 4-digit year in the first few lines
  const firstLines = fullText.split('\n').slice(0, 20).join(' ');
  const yearInHeader = firstLines.match(/\b(20\d{2})\b/);
  if (yearInHeader) return parseInt(yearInHeader[1]);

  return undefined;
}

/**
 * Clean and normalize a description string
 */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .replace(/^\d{1,2}\/\d{1,2}\s*/, '') // Remove posting date at start
    .replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*/i, '') // Remove posting date
    .replace(/\s+$/, '')
    .trim();
}

/**
 * Main PDF parsing function
 */
export async function parsePdf(file: File): Promise<PdfParseResult> {
  try {
    const pages = await extractTextFromPdf(file);

    if (pages.length === 0 || pages.every(p => !p.trim())) {
      return {
        success: false,
        transactions: [],
        metadata: {},
        error: 'Could not extract text from PDF. The file may be scanned/image-based.',
      };
    }

    const fullText = pages.join('\n');
    const metadata = extractMetadata(fullText);
    const contextYear = detectStatementYear(fullText);

    console.log('PDF metadata:', metadata);
    console.log('Context year:', contextYear);

    const transactions: ParsedTransaction[] = [];
    const seenTransactions = new Set<string>(); // For deduplication

    for (const pageText of pages) {
      const lines = pageText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (shouldSkipLine(line)) continue;

        // Try to parse this line as a transaction
        const dateResult = parseDateFromLine(line, contextYear);
        if (!dateResult) continue;

        // Check for a second date (posting date) immediately after the transaction date
        let remainingText = dateResult.rest;
        const postingDate = parseDateFromLine(remainingText, contextYear);
        if (postingDate) {
          remainingText = postingDate.rest;
        }

        // Extract amount from remaining text
        const amountResult = extractAmount(remainingText);
        if (!amountResult) {
          // Sometimes the amount is on the next line or the line is multi-part
          // Try combining with next line
          if (i + 1 < lines.length) {
            const combinedText = remainingText + '  ' + lines[i + 1].trim();
            const combinedAmount = extractAmount(combinedText);
            if (combinedAmount && combinedAmount.description.length > 2) {
              const description = cleanDescription(combinedAmount.description);
              const direction = detectDirectionFromDescription(description, combinedAmount.isCredit);
              const dedupeKey = `${dateResult.date}|${combinedAmount.amount}|${description.slice(0, 20)}`;

              if (!seenTransactions.has(dedupeKey) && description.length > 1) {
                seenTransactions.add(dedupeKey);
                transactions.push({
                  date: dateResult.date,
                  description,
                  amount: combinedAmount.amount,
                  direction,
                });
                i++; // Skip the next line since we consumed it
              }
            }
          }
          continue;
        }

        const description = cleanDescription(amountResult.description);
        if (description.length < 2) continue;

        const direction = detectDirectionFromDescription(description, amountResult.isCredit);
        const dedupeKey = `${dateResult.date}|${amountResult.amount}|${description.slice(0, 20)}`;

        if (!seenTransactions.has(dedupeKey)) {
          seenTransactions.add(dedupeKey);
          transactions.push({
            date: dateResult.date,
            description,
            amount: amountResult.amount,
            direction,
          });
        }
      }
    }

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        metadata,
        error: 'Could not extract any transactions from the PDF. The statement format may not be supported yet.',
      };
    }

    console.log(`Parsed ${transactions.length} transactions from PDF`);
    return { success: true, transactions, metadata };
  } catch (error) {
    console.error('PDF parse error:', error);
    return {
      success: false,
      transactions: [],
      metadata: {},
      error: `Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
