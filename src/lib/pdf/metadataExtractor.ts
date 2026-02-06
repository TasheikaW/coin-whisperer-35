import type { StatementMetadata } from './types';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Detect the statement year from text context.
 */
export function detectStatementYear(fullText: string): number | undefined {
  // Look for explicit year mentions near "statement" keywords
  const yearMatch = fullText.match(/(?:statement|period|date)[^]*?(\b20\d{2}\b)/i);
  if (yearMatch) return parseInt(yearMatch[1]);

  // Look for DDMMMYY patterns like 05JUL24
  const ddmmmyy = fullText.match(/\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2})/i);
  if (ddmmmyy) {
    const yy = parseInt(ddmmmyy[1]);
    return (yy > 50 ? 1900 : 2000) + yy;
  }

  // Look for any 4-digit year in the first few lines
  const firstLines = fullText.split('\n').slice(0, 20).join(' ');
  const yearInHeader = firstLines.match(/\b(20\d{2})\b/);
  if (yearInHeader) return parseInt(yearInHeader[1]);

  return undefined;
}

/**
 * Detect currency from text (J$, A$, C$, etc.)
 */
export function detectCurrency(fullText: string): string | undefined {
  if (/J\$/.test(fullText)) return 'JMD';
  if (/A\$/.test(fullText)) return 'AUD';
  if (/C\$/.test(fullText) || /CAD/i.test(fullText)) return 'CAD';
  if (/€/.test(fullText) || /EUR/i.test(fullText)) return 'EUR';
  if (/£/.test(fullText) || /GBP/i.test(fullText)) return 'GBP';
  // Default: don't override — let upstream decide
  return undefined;
}

/**
 * Extract metadata (institution, period, account type, etc.) from the full statement text.
 */
export function extractMetadata(fullText: string): StatementMetadata {
  const metadata: StatementMetadata = {};

  // ── Statement period ──
  // Standard: "Statement Period: Jan 1 - Jan 31, 2024"
  let periodMatch = fullText.match(
    /statement\s+(?:period|from)[:\s]*([\w\s\d,]+?)\s*(?:to|-|–|through)\s*([\w\s\d,]+)/i,
  );
  if (periodMatch) {
    metadata.statementPeriodStart = periodMatch[1].trim();
    metadata.statementPeriodEnd = periodMatch[2].trim();
  }

  // Scotiabank compact: "05JUL24 to 05AUG24"
  if (!metadata.statementPeriodStart) {
    periodMatch = fullText.match(
      /(\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2})\s*(?:to|-|–)\s*(\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2})/i,
    );
    if (periodMatch) {
      metadata.statementPeriodStart = periodMatch[1].trim();
      metadata.statementPeriodEnd = periodMatch[2].trim();
    }
  }

  // ── Statement date ──
  const stmtDateMatch = fullText.match(
    /statement\s+date[:\s]*(\w+\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  );
  if (stmtDateMatch) metadata.statementDate = stmtDateMatch[1].trim();

  // ── Last 4 digits / account number ──
  const cardMatch = fullText.match(
    /(?:card|account)\s*(?:number|#|no\.?)?[:\s]*[*xX.·•]*\s*(\d{4,6})/i,
  );
  if (cardMatch) metadata.lastFourDigits = cardMatch[1];

  // ── Institution detection ──
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
    [/\b(national\s+commercial\s+bank|ncb)/i, 'NCB'],
    [/\b(first\s+caribbean)/i, 'FirstCaribbean'],
  ];

  for (const [pattern, name] of institutionPatterns) {
    if (pattern.test(fullText)) {
      metadata.institution = name;
      break;
    }
  }

  // ── Account type ──
  if (/visa|mastercard|credit\s+card/i.test(fullText)) {
    const cardBrand = /visa/i.test(fullText)
      ? 'Visa'
      : /mastercard/i.test(fullText)
        ? 'Mastercard'
        : 'Credit Card';
    metadata.accountName = metadata.institution
      ? `${metadata.institution} ${cardBrand}`
      : cardBrand;
  } else if (/chequing|checking|savings/i.test(fullText)) {
    const type = /chequing|checking/i.test(fullText) ? 'Chequing' : 'Savings';
    metadata.accountName = metadata.institution ? `${metadata.institution} ${type}` : type;
  }

  // ── Balance ──
  const balanceMatch = fullText.match(
    /(?:new|closing|current)\s+balance[:\s]*\$?([\d,]+\.\d{2})/i,
  );
  if (balanceMatch) metadata.newBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));

  // ── Minimum payment ──
  const minPayMatch = fullText.match(/minimum\s+payment[:\s]*\$?([\d,]+\.\d{2})/i);
  if (minPayMatch) metadata.minimumPayment = parseFloat(minPayMatch[1].replace(/,/g, ''));

  // ── Due date ──
  const dueDateMatch = fullText.match(
    /(?:payment\s+)?due\s+date[:\s]*([\w\s\d,]+?\d{4})/i,
  );
  if (dueDateMatch) metadata.dueDate = dueDateMatch[1].trim();

  // ── Currency ──
  metadata.currency = detectCurrency(fullText);

  return metadata;
}
