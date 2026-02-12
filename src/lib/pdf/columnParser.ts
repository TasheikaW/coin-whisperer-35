import type { ParsedTransaction } from './types';
import type { ColumnLayout, ColumnRow, PageItems } from './columnExtractor';
import { assignRowToColumns } from './columnExtractor';
import { parseDateFromLine } from './dateParser';
import { detectStatementYear, extractMetadata, detectCurrency } from './metadataExtractor';

/**
 * Column-based PDF parser for statements with separate Credit/Debit/Balance columns.
 *
 * Works by detecting column header positions (X-coordinates) and then
 * assigning each text item in a row to the correct column based on proximity.
 */

const HEADER_SKIP_PATTERNS = [
  /^(date|trans|post)/i,
  /^(description|details?|particular|narrative)/i,
  /^(opening|closing|previous|new|beginning|ending)\s+balance/i,
  /^(balance\s+brought|balance\s+carried)/i,
  /^(total|subtotal|sub\s+total)/i,
  /^page\s+\d+/i,
  /^(continued|carried\s+forward)/i,
  /^(statement|account)\s/i,
];

/**
 * Check if a row is a header/summary row that should be skipped.
 */
function isSkipRow(row: ColumnRow): boolean {
  const desc = row.descriptionText.toLowerCase().trim();
  const dateAndDesc = ((row.dateText || '') + ' ' + desc).trim().toLowerCase();

  if (!desc && !row.dateText && !row.creditText && !row.debitText) return true;

  for (const pattern of HEADER_SKIP_PATTERNS) {
    if (pattern.test(desc) || pattern.test(dateAndDesc)) return true;
  }

  // Skip if both credit and debit are empty
  if (!row.creditText && !row.debitText && !row.dateText) {
    // Could be a continuation line — don't skip entirely
    return false;
  }

  return false;
}

/**
 * Clean a merged description: remove trailing numbers, reference codes, standalone symbols.
 * Keeps hyphens inside words (e.g. PC-BILL) but strips standalone ones.
 */
function cleanMergedDescription(desc: string): string {
  return desc
    // Remove currency symbols like J$, A$, US$, $, etc.
    .replace(/[A-Z]{0,3}\$/gi, '')
    .replace(/[€£¥]/g, '')
    // Remove em-dash / en-dash separators
    .replace(/[—–]/g, '')
    // Remove standalone numbers (whole tokens that are purely digits)
    .replace(/\b\d+\b/g, '')
    // Remove standalone symbols (not hyphens inside words)
    .replace(/(?<![A-Za-z])-(?![A-Za-z])/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Clean amount text: strip currency symbols, commas, +/-, whitespace
 */
function cleanAmount(text: string): number | null {
  const cleaned = text
    .replace(/[A-Z]{1,3}\$?/g, '')
    .replace(/[$€£¥,\s]/g, '')
    .replace(/\+$/, '')
    .replace(/-$/, '')
    .replace(/^\((.+)\)$/, '$1')
    .trim();

  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

export interface ColumnParseResult {
  transactions: ParsedTransaction[];
  currency?: string;
}

/**
 * Parse transactions from page items using detected column layout.
 */
export function parseWithColumns(
  pages: PageItems[],
  layout: ColumnLayout,
  fullText: string,
): ColumnParseResult {
  const contextYear = detectStatementYear(fullText);
  const currency = detectCurrency(fullText);
  const transactions: ParsedTransaction[] = [];
  const seenKeys = new Set<string>();

  // Track last pending transaction for multi-line description merging
  let pendingTx: {
    date: string;
    descParts: string[];
    amount: number;
    direction: 'credit' | 'debit';
  } | null = null;

  const flushPending = () => {
    if (!pendingTx) return;
    const description = cleanMergedDescription(pendingTx.descParts.join(' '));
    if (description.length > 1) {
      const dedupeKey = `${pendingTx.date}|${pendingTx.amount}|${description.slice(0, 20)}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        transactions.push({
          date: pendingTx.date,
          description,
          amount: pendingTx.amount,
          direction: pendingTx.direction,
        });
      }
    }
    pendingTx = null;
  };

  for (const page of pages) {
    // Sort rows top-to-bottom (descending Y in PDF coordinates)
    const sortedYs = [...page.rows.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      // Skip rows at or above the header
      if (y >= layout.headerY) continue;

      const rowItems = page.rows.get(y)!;
      let row: ColumnRow;

      try {
        row = assignRowToColumns(rowItems, layout);
      } catch (err) {
        console.warn('Column assignment error at Y:', y, err);
        continue;
      }

      if (isSkipRow(row)) continue;

      // Determine if this row has an amount
      const creditAmt = row.creditText ? cleanAmount(row.creditText) : null;
      const debitAmt = row.debitText ? cleanAmount(row.debitText) : null;
      const hasAmount = creditAmt !== null || debitAmt !== null;

      // Try to parse date
      let parsedDate: string | null = null;
      if (row.dateText) {
        const dateResult = parseDateFromLine(row.dateText.trim(), contextYear);
        if (dateResult) {
          parsedDate = dateResult.date;
        }
      }

      // ── Case 1: Row with date + amount = new transaction ──
      if (parsedDate && hasAmount) {
        flushPending();

        const amount = creditAmt ?? debitAmt!;
        const direction: 'credit' | 'debit' = creditAmt !== null ? 'credit' : 'debit';

        pendingTx = {
          date: parsedDate,
          descParts: row.descriptionText ? [row.descriptionText] : [],
          amount,
          direction,
        };
        continue;
      }

      // ── Case 2: Row with date but no amount — might be a new transaction with amount on next line ──
      if (parsedDate && !hasAmount && row.descriptionText) {
        flushPending();
        // Start a pending transaction without amount — will look for amount on continuation lines
        pendingTx = {
          date: parsedDate,
          descParts: [row.descriptionText],
          amount: 0,
          direction: 'debit',
        };
        continue;
      }

      // ── Case 3: No date — continuation of previous transaction ──
      if (!parsedDate && pendingTx) {
        // Append description
        if (row.descriptionText) {
          pendingTx.descParts.push(row.descriptionText);
        }
        // If this continuation line has an amount and the pending tx doesn't, use it
        if (hasAmount && pendingTx.amount === 0) {
          pendingTx.amount = creditAmt ?? debitAmt!;
          pendingTx.direction = creditAmt !== null ? 'credit' : 'debit';
        }
        continue;
      }

      // ── Case 4: No date, no pending — skip ──
    }
  }

  // Flush the last pending transaction
  flushPending();

  // Filter out transactions with 0 amount
  const validTransactions = transactions.filter(t => t.amount > 0);

  console.log(`Column parser found ${validTransactions.length} transactions`);
  return { transactions: validTransactions, currency };
}
