import type { StructuredLine, TextSegment } from './textExtractor';

/**
 * Range of X positions for a detected column.
 */
export interface XRange {
  min: number;
  max: number;
}

/**
 * Detected column layout for a page.
 */
export interface ColumnLayout {
  mode: 'single' | 'split';
  debitX?: XRange;
  creditX?: XRange;
  amountX?: XRange;
  balanceX?: XRange;
}

// Keywords for column header detection (lowercased)
const DEBIT_KEYWORDS = ['debit', 'withdrawal', 'withdrawals', 'charges', 'purchases', 'dr'];
const CREDIT_KEYWORDS = ['credit', 'credits', 'deposit', 'deposits', 'payments', 'cr'];
const AMOUNT_KEYWORDS = ['amount'];
const BALANCE_KEYWORDS = ['balance', 'running balance', 'running bal'];

/**
 * Check if a text segment matches any keyword from a list.
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some(kw => lower === kw || lower.includes(kw));
}

/**
 * Find the X range for a segment (using its X position and width).
 */
function segmentRange(seg: TextSegment, tolerance: number = 40): XRange {
  return {
    min: seg.x - tolerance,
    max: seg.x + seg.width + tolerance,
  };
}

/**
 * Detect the column layout from the first N lines of a page.
 * Looks for header rows containing debit/credit/amount/balance keywords
 * and records their X-position ranges.
 */
export function detectColumnLayout(lines: StructuredLine[], scanLines: number = 30): ColumnLayout {
  const layout: ColumnLayout = { mode: 'single' };

  // Scan first N lines for header rows
  const linesToScan = lines.slice(0, Math.min(scanLines, lines.length));

  for (const line of linesToScan) {
    let hasDebit = false;
    let hasCredit = false;

    for (const seg of line.segments) {
      const text = seg.text.trim();
      if (!text) continue;

      if (matchesKeywords(text, DEBIT_KEYWORDS)) {
        layout.debitX = segmentRange(seg);
        hasDebit = true;
      } else if (matchesKeywords(text, CREDIT_KEYWORDS)) {
        layout.creditX = segmentRange(seg);
        hasCredit = true;
      } else if (matchesKeywords(text, AMOUNT_KEYWORDS)) {
        layout.amountX = segmentRange(seg);
      } else if (matchesKeywords(text, BALANCE_KEYWORDS)) {
        layout.balanceX = segmentRange(seg);
      }
    }

    // If we found both debit and credit on the same header line, we have a split layout
    if (hasDebit && hasCredit) {
      layout.mode = 'split';
      // We found the header — stop scanning
      break;
    }
  }

  return layout;
}

/**
 * Given all amount-like segments on a line and the column layout,
 * determine the transaction amount and direction.
 *
 * Returns null if no valid amount can be assigned.
 */
export function assignAmountFromColumns(
  amountSegments: { amount: number; x: number }[],
  layout: ColumnLayout,
): { amount: number; direction: 'debit' | 'credit' } | null {
  if (amountSegments.length === 0) return null;

  if (layout.mode === 'split' && (layout.debitX || layout.creditX)) {
    // Filter out balance column amounts first
    const filtered = amountSegments.filter(seg => {
      if (layout.balanceX && isInRange(seg.x, layout.balanceX)) return false;
      return true;
    });

    // Try to match to debit or credit column
    for (const seg of filtered) {
      if (layout.debitX && isInRange(seg.x, layout.debitX)) {
        return { amount: seg.amount, direction: 'debit' };
      }
      if (layout.creditX && isInRange(seg.x, layout.creditX)) {
        return { amount: seg.amount, direction: 'credit' };
      }
    }

    // If we have filtered amounts that don't match any column,
    // use the first non-balance one with sign-based direction
    if (filtered.length > 0) {
      return {
        amount: filtered[0].amount,
        direction: 'debit', // default
      };
    }

    return null;
  }

  // Single-column mode: filter out balance column, use the first remaining
  const filtered = amountSegments.filter(seg => {
    if (layout.balanceX && isInRange(seg.x, layout.balanceX)) return false;
    return true;
  });

  if (filtered.length > 0) {
    return { amount: filtered[0].amount, direction: 'debit' };
  }

  return null;
}

/**
 * Check if an X position falls within a range.
 */
function isInRange(x: number, range: XRange): boolean {
  return x >= range.min && x <= range.max;
}
