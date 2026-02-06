import type { ParsedTransaction, PdfParseResult } from './types';
import { extractStructuredTextFromPdf, type StructuredPage, type StructuredLine } from './textExtractor';
import { parseDateFromLine } from './dateParser';
import { extractAmount, extractAllAmounts } from './amountParser';
import { shouldSkipLine, stripReferencePrefix } from './lineFilters';
import { detectDirection } from './directionDetector';
import { extractMetadata, detectStatementYear } from './metadataExtractor';
import { detectGlobalColumnLayout, assignAmountFromColumns, type ColumnLayout } from './columnDetector';

/** Currency prefix pattern to strip from descriptions */
const CURRENCY_PREFIX_RE = /^[A-Z]{1,3}\$\s*/;

/** Amount-like text pattern */
const AMOUNT_TEXT_RE = /^[($-]*\$?\s*-?\s*[\d,]+\.\d{2}\s*[)+-]?\s*$/;

/** Patterns that signal the end of the transaction table */
const END_OF_TABLE_PATTERNS = [
  /closing\s*balance/i,
  /opening\s*balance/i,
  /total\s*debits/i,
  /total\s*credits/i,
  /total\s*withdrawals/i,
  /total\s*deposits/i,
  /statement\s*summary/i,
  /interest\s*charged/i,
  /service\s*charges/i,
];

/**
 * Check if a line is an end-of-table marker (summary row, totals, etc.)
 */
function isEndOfTableMarker(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return END_OF_TABLE_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Clean and normalise a description string.
 */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\s{2,}/g, ' ')
    // Remove posting date at start  (e.g. "01/15 " or "Jan 15 ")
    .replace(/^\d{1,2}\/\d{1,2}\s*/, '')
    .replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*/i, '')
    // Strip leading currency prefixes (J$, A$, C$, etc.)
    .replace(CURRENCY_PREFIX_RE, '')
    .replace(/\s+$/, '')
    .trim();
}

/**
 * Try to parse a single line into a transaction date + remaining text.
 * Returns null when the line is not a transaction.
 */
function tryParseLine(
  line: string,
  contextYear: number | undefined,
): {
  date: string;
  remainingText: string;
} | null {
  // 1. Strip reference prefix if present
  const cleaned = stripReferencePrefix(line);

  // 2. Try to extract a date from the start
  const dateResult = parseDateFromLine(cleaned, contextYear);
  if (!dateResult) return null;

  // 3. Skip a second (posting) date if present
  let remainingText = dateResult.rest;
  const postingDate = parseDateFromLine(remainingText, contextYear);
  if (postingDate) {
    remainingText = postingDate.rest;
  }

  return { date: dateResult.date, remainingText };
}

/**
 * Check whether a segment is in any of the amount column ranges
 * (debit, credit, or balance). Used to filter description segments.
 */
function isInAmountColumn(segX: number, layout: ColumnLayout): boolean {
  const inRange = (x: number, r: { min: number; max: number }) => x >= r.min && x <= r.max;
  if (layout.debitX && inRange(segX, layout.debitX)) return true;
  if (layout.creditX && inRange(segX, layout.creditX)) return true;
  if (layout.balanceX && inRange(segX, layout.balanceX)) return true;
  return false;
}

/**
 * Attempt column-aware amount extraction using structured segments.
 * In split mode, builds the description only from segments that are NOT
 * in any amount column (debit, credit, or balance).
 */
function tryColumnAwareExtraction(
  structuredLine: StructuredLine,
  layout: ColumnLayout,
): { amount: number; direction: 'debit' | 'credit'; description: string } | null {
  // Work in split mode OR single mode when a balance column is detected
  if (layout.mode !== 'split' && !layout.balanceX) return null;

  const amounts = extractAllAmounts(structuredLine.segments);
  if (amounts.length === 0) return null;

  let resultAmount: number | null = null;
  let resultDirection: 'debit' | 'credit' = 'debit';

  if (layout.mode === 'split') {
    // Split mode: use column assignment
    const result = assignAmountFromColumns(amounts, layout);
    if (!result || result.amount <= 0) return null;
    resultAmount = result.amount;
    resultDirection = result.direction;
  } else {
    // Single mode with balance column knowledge:
    // Filter out amounts in the balance column range
    const inRange = (x: number, r: { min: number; max: number }) => x >= r.min && x <= r.max;
    const filtered = amounts.filter(a => !(layout.balanceX && inRange(a.x, layout.balanceX)));
    if (filtered.length === 0) return null;

    // Use the first non-balance amount
    const main = filtered[0];
    resultAmount = main.amount;

    // Use preserved sign for direction
    if (main.sign === '+') resultDirection = 'credit';
    else if (main.sign === '-') resultDirection = 'debit';
    // else: default 'debit' stays
  }

  if (!resultAmount || resultAmount <= 0) return null;

  // Build description only from segments NOT in any amount column
  const amountXPositions = new Set(amounts.map(a => a.x));
  const descSegments = structuredLine.segments.filter(seg => {
    if (amountXPositions.has(seg.x)) return false;
    if (isInAmountColumn(seg.x, layout)) return false;
    if (AMOUNT_TEXT_RE.test(seg.text.trim())) return false;
    return true;
  });

  const rawDesc = descSegments.map(s => s.text).join(' ').trim();
  const description = rawDesc.replace(CURRENCY_PREFIX_RE, '').trim();

  return {
    amount: resultAmount,
    direction: resultDirection,
    description,
  };
}

/**
 * Main PDF parsing function.
 */
export async function parsePdf(file: File): Promise<PdfParseResult> {
  try {
    const structuredPages = await extractStructuredTextFromPdf(file);

    if (structuredPages.length === 0 || structuredPages.every(p => !p.text.trim())) {
      return {
        success: false,
        transactions: [],
        metadata: {},
        error: 'Could not extract text from PDF. The file may be scanned/image-based.',
      };
    }

    const fullText = structuredPages.map(p => p.text).join('\n');
    const metadata = extractMetadata(fullText);
    const contextYear = detectStatementYear(fullText);

    console.log('PDF metadata:', metadata);
    console.log('Context year:', contextYear);

    // Detect column layout GLOBALLY across all pages
    const globalLayout = detectGlobalColumnLayout(structuredPages);
    console.log('Global column layout:', globalLayout);

    const transactions: ParsedTransaction[] = [];
    const seenTransactions = new Set<string>();

    // Determine page/line boundaries from header detection
    const headerPageIndex = globalLayout.headerPageIndex;
    const tableStartLine = globalLayout.tableStartLine;
    const hasHeader = headerPageIndex >= 0;

    for (let pageIdx = 0; pageIdx < structuredPages.length; pageIdx++) {
      // If a header was found, skip pages before the header page
      if (hasHeader && pageIdx < headerPageIndex) continue;

      const lines = structuredPages[pageIdx].lines;

      // Determine which line to start from on this page
      const startLine = (hasHeader && pageIdx === headerPageIndex) ? tableStartLine : 0;

      for (let i = startLine; i < lines.length; i++) {
        const structuredLine = lines[i];
        const lineText = structuredLine.text;

        if (shouldSkipLine(lineText)) continue;

        // End-of-table detection: stop parsing this page if we hit summary markers
        if (isEndOfTableMarker(lineText)) {
          console.log(`End-of-table marker found: "${lineText.trim().slice(0, 50)}"`);
          break;
        }

        const parsed = tryParseLine(lineText, contextYear);
        if (!parsed) continue;

        const { date, remainingText } = parsed;

        // ── Strategy 1: Column-aware extraction (split mode OR single with balance column) ──
        const colResult = tryColumnAwareExtraction(structuredLine, globalLayout);
        if (colResult && colResult.amount > 0) {
          // Build description: prefer date-parsed text (strips dates) but fall back to column-aware
          const descFromText = cleanDescription(remainingText.replace(/[\d,]+\.\d{2}/g, '').trim());
          const description = descFromText.length > 2 ? descFromText : cleanDescription(colResult.description);

          if (description.length > 1) {
            // Gather continuation lines
            const descParts = [description];
            let j = i + 1;
            while (j < lines.length) {
              const nextLine = lines[j].text.trim();
              if (!nextLine || shouldSkipLine(nextLine)) { j++; continue; }
              const strippedNext = stripReferencePrefix(nextLine);
              if (parseDateFromLine(strippedNext, contextYear)) break;
              if (extractAllAmounts(lines[j].segments).length > 0) break;
              descParts.push(nextLine);
              j++;
            }

            const fullDesc = descParts.join(' — ');
            const dedupeKey = `${date}|${colResult.amount}|${fullDesc.slice(0, 20)}`;

            if (!seenTransactions.has(dedupeKey)) {
              seenTransactions.add(dedupeKey);
              transactions.push({
                date,
                description: fullDesc,
                amount: colResult.amount,
                direction: colResult.direction,
              });
            }
            i = j - 1;
            continue;
          }
        }

        // If split mode and column-aware extraction failed, skip (don't guess)
        if (globalLayout.mode === 'split') continue;

        // ── Strategy 2: Single-column / sign-based extraction (existing logic) ──
        let amountResult = extractAmount(remainingText);

        if (amountResult && amountResult.description.length >= 2) {
          // Gather continuation lines (lines without a date, indented or short)
          const descParts = [cleanDescription(amountResult.description)];
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j].text.trim();
            if (!nextLine || shouldSkipLine(nextLine)) { j++; continue; }
            // If the next line starts with a date, stop gathering
            const strippedNext = stripReferencePrefix(nextLine);
            if (parseDateFromLine(strippedNext, contextYear)) break;
            // If it has its own amount it's probably a separate entry
            if (extractAmount(nextLine)) break;
            descParts.push(nextLine);
            j++;
          }

          const description = descParts.join(' — ');
          const direction = detectDirection(
            description,
            amountResult.isCredit,
            amountResult.signFromSuffix,
          );
          const dedupeKey = `${date}|${amountResult.amount}|${description.slice(0, 20)}`;

          if (!seenTransactions.has(dedupeKey) && description.length > 1) {
            seenTransactions.add(dedupeKey);
            transactions.push({
              date,
              description,
              amount: amountResult.amount,
              direction,
            });
          }
          // Advance past the continuation lines we consumed
          i = j - 1;
          continue;
        }

        // ── Amount not on this line — try combining with the next line ──
        if (i + 1 < lines.length) {
          const combinedText = remainingText + '  ' + lines[i + 1].text.trim();
          amountResult = extractAmount(combinedText);
          if (amountResult && amountResult.description.length > 2) {
            const description = cleanDescription(amountResult.description);
            const direction = detectDirection(
              description,
              amountResult.isCredit,
              amountResult.signFromSuffix,
            );
            const dedupeKey = `${date}|${amountResult.amount}|${description.slice(0, 20)}`;

            if (!seenTransactions.has(dedupeKey) && description.length > 1) {
              seenTransactions.add(dedupeKey);
              transactions.push({ date, description, amount: amountResult.amount, direction });
              i++; // skip consumed line
            }
          }
        }
      }
    }

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        metadata,
        error:
          'Could not extract any transactions from the PDF. The statement format may not be supported yet.',
      };
    }

    // Pass detected currency up to the caller
    const currency = metadata.currency;

    console.log(`Parsed ${transactions.length} transactions from PDF`);
    return { success: true, transactions, metadata, currency };
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
