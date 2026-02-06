import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

export interface PageItems {
  items: TextItem[];
  rows: Map<number, TextItem[]>;
}

export interface ColumnLayout {
  creditX: number | null;
  debitX: number | null;
  balanceX: number | null;
  dateX: number | null;
  descriptionX: number | null;
  headerY: number;
}

export interface ColumnRow {
  y: number;
  dateText: string | null;
  descriptionText: string;
  creditText: string | null;
  debitText: string | null;
  balanceText: string | null;
}

const COLUMN_TOLERANCE = 40; // px tolerance for matching an item to a column header

/**
 * Extract raw text items with positions from all pages.
 */
export async function extractItemsFromPdf(file: File): Promise<PageItems[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PageItems[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items: TextItem[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({
        text: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: item.width ?? item.str.length * 5,
      });
    }

    // Group by Y to form rows
    const rows = new Map<number, TextItem[]>();
    for (const item of items) {
      // Snap Y to nearest 2px to group items on the same visual line
      const snappedY = Math.round(item.y / 2) * 2;
      if (!rows.has(snappedY)) rows.set(snappedY, []);
      rows.get(snappedY)!.push(item);
    }

    // Sort items within each row by X
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
    }

    pages.push({ items, rows });
  }

  return pages;
}

/**
 * Detect column header positions by scanning for Credit/Debit/Balance header words.
 */
export function detectColumnLayout(pages: PageItems[]): ColumnLayout | null {
  for (const page of pages) {
    const sortedYs = [...page.rows.keys()].sort((a, b) => b - a); // top to bottom in PDF coords

    for (const y of sortedYs) {
      const rowItems = page.rows.get(y)!;
      const rowText = rowItems.map(i => i.text.toLowerCase().trim()).join(' ');

      // Check if this row contains column headers
      const hasCredit = rowItems.find(i =>
        /^credit/i.test(i.text.trim()) || /^cr$/i.test(i.text.trim())
      );
      const hasDebit = rowItems.find(i =>
        /^debit/i.test(i.text.trim()) || /^dr$/i.test(i.text.trim()) ||
        /^withdrawal/i.test(i.text.trim()) || /^charges?$/i.test(i.text.trim())
      );
      const hasBalance = rowItems.find(i =>
        /balance/i.test(i.text.trim())
      );

      // Need at least credit+debit or credit+balance or debit+balance to confirm column layout
      if ((hasCredit && hasDebit) || (hasCredit && hasBalance) || (hasDebit && hasBalance)) {
        // Also try to detect date and description columns
        const hasDate = rowItems.find(i =>
          /^(date|trans|post)/i.test(i.text.trim())
        );
        const hasDesc = rowItems.find(i =>
          /^(description|details?|particular|narrative|memo)/i.test(i.text.trim())
        );

        console.log('Detected column headers at Y:', y, {
          credit: hasCredit?.x,
          debit: hasDebit?.x,
          balance: hasBalance?.x,
          date: hasDate?.x,
          desc: hasDesc?.x,
        });

        return {
          creditX: hasCredit ? hasCredit.x : null,
          debitX: hasDebit ? hasDebit.x : null,
          balanceX: hasBalance ? hasBalance.x : null,
          dateX: hasDate ? hasDate.x : null,
          descriptionX: hasDesc ? hasDesc.x : null,
          headerY: y,
        };
      }
    }
  }

  return null;
}

/**
 * Parse a numeric string, stripping currency symbols, commas, +/- signs.
 */
function parseNumericValue(text: string): number | null {
  const cleaned = text
    .replace(/[A-Z]{1,3}\$?/g, '') // J$, A$, C$, etc.
    .replace(/[$€£¥,\s+]/g, '')
    .replace(/^\((.+)\)$/, '-$1') // (100.00) → -100.00
    .trim();

  if (!cleaned || cleaned === '-') return null;

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Check if a text item is numeric (an amount).
 */
function isAmountText(text: string): boolean {
  const stripped = text
    .replace(/[A-Z]{1,3}\$?/g, '')
    .replace(/[$€£¥,\s+\-()]/g, '')
    .trim();
  return /^\d+\.?\d*$/.test(stripped);
}

/**
 * Assign text items in a row to the detected columns based on X-position proximity.
 */
export function assignRowToColumns(
  rowItems: TextItem[],
  layout: ColumnLayout,
): ColumnRow {
  let dateText: string | null = null;
  let descParts: string[] = [];
  let creditText: string | null = null;
  let debitText: string | null = null;
  let balanceText: string | null = null;

  for (const item of rowItems) {
    const text = item.text.trim();
    if (!text) continue;

    // Check if this item is close to a known column header X-position
    const isNearCredit = layout.creditX !== null && Math.abs(item.x - layout.creditX) < COLUMN_TOLERANCE;
    const isNearDebit = layout.debitX !== null && Math.abs(item.x - layout.debitX) < COLUMN_TOLERANCE;
    const isNearBalance = layout.balanceX !== null && Math.abs(item.x - layout.balanceX) < COLUMN_TOLERANCE;

    // If it's a number near a column header, assign it
    if (isAmountText(text)) {
      if (isNearBalance) {
        balanceText = text;
        continue;
      }
      if (isNearCredit) {
        creditText = text;
        continue;
      }
      if (isNearDebit) {
        debitText = text;
        continue;
      }

      // If numeric but not near any known column — try to figure out by position
      // Items furthest right tend to be Balance, then Credit/Debit
      if (layout.balanceX !== null && layout.creditX !== null && layout.debitX !== null) {
        // All three columns known — if it doesn't match any, treat as description part
        descParts.push(text);
      } else {
        // Fallback: treat unmatched numeric as description
        descParts.push(text);
      }
      continue;
    }

    // Non-numeric items: check if it's a date or description
    if (layout.dateX !== null && Math.abs(item.x - layout.dateX) < COLUMN_TOLERANCE) {
      dateText = dateText ? dateText + ' ' + text : text;
    } else if (layout.descriptionX !== null && Math.abs(item.x - layout.descriptionX) < COLUMN_TOLERANCE) {
      descParts.push(text);
    } else {
      // If no column matched, use heuristics based on position
      // Items left of the credit/debit columns are likely date or description
      const rightmostDataCol = Math.min(
        ...[layout.creditX, layout.debitX, layout.balanceX].filter((x): x is number => x !== null)
      );

      if (item.x < rightmostDataCol - COLUMN_TOLERANCE) {
        // Could be date or description
        if (!dateText && isDateLike(text)) {
          dateText = text;
        } else {
          descParts.push(text);
        }
      } else {
        // Right-side text near numeric columns — might be CR/DR suffix, ignore
      }
    }
  }

  return {
    y: rowItems[0]?.y ?? 0,
    dateText,
    descriptionText: descParts.join(' ').trim(),
    creditText,
    debitText,
    balanceText,
  };
}

/**
 * Quick check if a string looks like a date.
 */
function isDateLike(text: string): boolean {
  return /^\d{1,2}[\/.\\-]\d{1,2}([\/.\\-]\d{2,4})?$/.test(text.trim()) ||
    /^\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text.trim()) ||
    /^\d{2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text.trim());
}
