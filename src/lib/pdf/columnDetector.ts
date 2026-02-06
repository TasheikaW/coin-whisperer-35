import type { StructuredLine, StructuredPage, TextSegment } from './textExtractor';

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
  /** Line index where transaction data begins (after header/sub-header rows). -1 if no header found. */
  tableStartLine: number;
  /** Page index where the table header was found. -1 if not found. */
  headerPageIndex: number;
}

// Keywords for column header detection (lowercased)
const DEBIT_KEYWORDS = ['debit', 'withdrawal', 'withdrawals', 'charges', 'purchases', 'dr'];
const CREDIT_KEYWORDS = ['credit', 'credits', 'deposit', 'deposits', 'payments', 'cr'];
const AMOUNT_KEYWORDS = ['amount'];
const BALANCE_KEYWORDS = ['balance', 'running balance', 'running bal'];

/**
 * Check if a text segment matches any keyword from a list.
 * Only considers short segments (< 30 chars) — long phrases like
 * "Transactions ( Withdrawals & Deposits )" are titles, not column headers.
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length > 30) return false; // Too long to be a column header
  return keywords.some(kw => lower === kw || lower.includes(kw));
}

/**
 * Find the X range for a segment (using its X position and width).
 * Reduced tolerance from 40 to 20 to prevent overlapping column ranges.
 */
function segmentRange(seg: TextSegment, tolerance: number = 20): XRange {
  return {
    min: seg.x - tolerance,
    max: seg.x + seg.width + tolerance,
  };
}

/**
 * Resolve overlapping debit and credit column ranges by splitting at the midpoint.
 */
function resolveOverlaps(layout: ColumnLayout): void {
  if (layout.debitX && layout.creditX) {
    // Ensure debitX is to the left of creditX; swap if needed
    if (layout.debitX.min > layout.creditX.min) {
      const tmp = layout.debitX;
      layout.debitX = layout.creditX;
      layout.creditX = tmp;
      // Note: direction assignment is based on original header keyword, not position,
      // so we don't need to swap directions
    }

    // Check for overlap and resolve
    if (layout.debitX.max > layout.creditX.min) {
      const mid = (layout.debitX.max + layout.creditX.min) / 2;
      layout.debitX.max = mid;
      layout.creditX.min = mid;
    }
  }
}

// ── Table Header Detection ──────────────────────────────────────────────────

/** Keywords that identify the "Date" column in a table header */
const DATE_HEADER_KEYWORDS = ['transaction date', 'trans date', 'date', 'posting date', 'value date'];

/** Keywords that identify the "Description" column in a table header */
const DESC_HEADER_KEYWORDS = ['description', 'details', 'particulars', 'narrative'];

/**
 * Result of scanning for a table header row on a page.
 */
export interface TableHeaderResult {
  /** Line index of the header row (-1 if not found) */
  headerLineIndex: number;
  /** First line index after all header/sub-header rows */
  tableStartLine: number;
  /** Column layout extracted from headers */
  layout: ColumnLayout;
}

/**
 * Scan lines on a single page for a table header row containing both
 * date and description keywords. When found, also scans for sub-header
 * rows (e.g. CREDIT / DEBIT) and extracts column positions.
 */
export function findTableHeaderLine(lines: StructuredLine[]): TableHeaderResult {
  const noResult: TableHeaderResult = {
    headerLineIndex: -1,
    tableStartLine: 0,
    layout: { mode: 'single', tableStartLine: 0, headerPageIndex: -1 },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTextLower = line.text.toLowerCase();

    // Check for date keyword
    const hasDate = DATE_HEADER_KEYWORDS.some(kw => lineTextLower.includes(kw));
    if (!hasDate) continue;

    // Check for description keyword
    const hasDesc = DESC_HEADER_KEYWORDS.some(kw => lineTextLower.includes(kw));
    if (!hasDesc) continue;

    // Found the table header row! Extract column positions from this line.
    const layout: ColumnLayout = { mode: 'single', tableStartLine: -1, headerPageIndex: -1 };

    for (const seg of line.segments) {
      const text = seg.text.trim();
      if (!text) continue;
      if (matchesKeywords(text, AMOUNT_KEYWORDS)) {
        layout.amountX = segmentRange(seg);
      } else if (matchesKeywords(text, BALANCE_KEYWORDS)) {
        layout.balanceX = segmentRange(seg);
      } else if (matchesKeywords(text, DEBIT_KEYWORDS)) {
        layout.debitX = segmentRange(seg);
      } else if (matchesKeywords(text, CREDIT_KEYWORDS)) {
        layout.creditX = segmentRange(seg);
      }
    }

    // Scan next 1-2 lines for sub-headers (CREDIT/DEBIT under Amount)
    let lastHeaderLine = i;
    for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
      const subLine = lines[j];
      let foundSub = false;

      for (const seg of subLine.segments) {
        const text = seg.text.trim();
        if (!text) continue;
        if (matchesKeywords(text, DEBIT_KEYWORDS)) {
          layout.debitX = segmentRange(seg);
          foundSub = true;
        } else if (matchesKeywords(text, CREDIT_KEYWORDS)) {
          layout.creditX = segmentRange(seg);
          foundSub = true;
        }
      }

      if (foundSub) {
        lastHeaderLine = j;
      } else {
        break; // No more sub-headers
      }
    }

    // Determine mode
    if (layout.debitX && layout.creditX) {
      layout.mode = 'split';
      resolveOverlaps(layout);
    }

    layout.tableStartLine = lastHeaderLine + 1;

    return {
      headerLineIndex: i,
      tableStartLine: lastHeaderLine + 1,
      layout,
    };
  }

  return noResult;
}

// ── Column Layout Detection (existing, updated) ────────────────────────────

/**
 * Detect the column layout from the first N lines of a set of lines.
 * Looks for header rows containing debit/credit/amount/balance keywords
 * and records their X-position ranges.
 */
export function detectColumnLayout(lines: StructuredLine[], scanLines: number = 30): ColumnLayout {
  const layout: ColumnLayout = { mode: 'single', tableStartLine: 0, headerPageIndex: -1 };

  // Scan first N lines for header rows
  const linesToScan = lines.slice(0, Math.min(scanLines, lines.length));

  for (const line of linesToScan) {
    // Skip lines with parentheses — these are section titles, not column headers
    if (/\(.*\)/.test(line.text)) continue;

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

    if (hasDebit && hasCredit) {
      layout.mode = 'split';
      resolveOverlaps(layout);
      break;
    }
  }

  return layout;
}

/**
 * Detect column layout globally across ALL pages.
 * First tries to find an explicit table header row (date + description keywords).
 * Falls back to scanning for debit/credit column keywords.
 */
export function detectGlobalColumnLayout(pages: StructuredPage[]): ColumnLayout {
  // Strategy 1: Find an explicit table header row on any page
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const headerResult = findTableHeaderLine(pages[pageIdx].lines);
    if (headerResult.headerLineIndex >= 0) {
      const layout = headerResult.layout;
      layout.tableStartLine = headerResult.tableStartLine;
      layout.headerPageIndex = pageIdx;
      console.log(`Table header found on page ${pageIdx}, line ${headerResult.headerLineIndex}. Transactions start at line ${headerResult.tableStartLine}.`, layout);
      return layout;
    }
  }

  // Strategy 2: Fall back to scanning for split-column headers
  for (const page of pages) {
    const layout = detectColumnLayout(page.lines);
    if (layout.mode === 'split') {
      console.log('Global column layout detected (split mode, no explicit header):', layout);
      return layout;
    }
  }

  // Fallback: single mode, no header found
  console.log('Global column layout: single mode (no headers found)');
  return { mode: 'single', tableStartLine: 0, headerPageIndex: -1 };
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
    // Filter out balance column amounts
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

    // In split mode, if an amount doesn't match any known column, skip it entirely.
    // Don't default to debit — this prevents balance column values from leaking through.
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
