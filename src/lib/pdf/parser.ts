import type { ParsedTransaction, PdfParseResult } from './types';
import { extractTextFromPdf } from './textExtractor';
import { parseDateFromLine } from './dateParser';
import { extractAmount } from './amountParser';
import { shouldSkipLine, stripReferencePrefix } from './lineFilters';
import { detectDirection } from './directionDetector';
import { extractMetadata, detectStatementYear } from './metadataExtractor';
import { extractItemsFromPdf, detectColumnLayout } from './columnExtractor';
import { parseWithColumns } from './columnParser';

/**
 * Clean and normalise a description string.
 */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\s{2,}/g, ' ')
    // Remove posting date at start  (e.g. "01/15 " or "Jan 15 ")
    .replace(/^\d{1,2}\/\d{1,2}\s*/, '')
    .replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*/i, '')
    .replace(/\s+$/, '')
    .trim();
}

/**
 * Try to parse a single line (or line + next lines) into a transaction.
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
 * Main PDF parsing function.
 */
export async function parsePdf(file: File): Promise<PdfParseResult> {
  try {
    // ── Strategy 1: Column-based parsing (Credit/Debit/Balance columns) ──
    let pageItems;
    try {
      pageItems = await extractItemsFromPdf(file);
      const layout = detectColumnLayout(pageItems);

      if (layout) {
        console.log('Detected column layout, using column-based parser');

        // Build full text for metadata extraction
        const fullText = pageItems
          .map(p =>
            [...p.rows.entries()]
              .sort(([a], [b]) => b - a)
              .map(([, items]) => items.map(i => i.text).join(' '))
              .join('\n'),
          )
          .join('\n');

        const metadata = extractMetadata(fullText);
        const columnResult = parseWithColumns(pageItems, layout, fullText);

        if (columnResult.transactions.length > 0) {
          console.log(
            `Column parser extracted ${columnResult.transactions.length} transactions`,
          );
          return {
            success: true,
            transactions: columnResult.transactions,
            metadata,
            currency: columnResult.currency || metadata.currency,
          };
        }

        console.log('Column parser found 0 transactions, falling back to line-based parser');
      }
    } catch (colErr) {
      console.warn('Column-based parsing failed, falling back to line-based:', colErr);
    }

    // ── Strategy 2: Line-based parsing (existing logic) ──
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
    const seenTransactions = new Set<string>();

    for (const pageText of pages) {
      const lines = pageText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (shouldSkipLine(line)) continue;

        const parsed = tryParseLine(line, contextYear);
        if (!parsed) continue;

        const { date, remainingText } = parsed;

        // ── Try to extract amount from this line ──
        let amountResult = extractAmount(remainingText);

        if (amountResult && amountResult.description.length >= 2) {
          // Gather continuation lines (lines without a date, indented or short)
          const descParts = [cleanDescription(amountResult.description)];
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j].trim();
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
          const combinedText = remainingText + '  ' + lines[i + 1].trim();
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
