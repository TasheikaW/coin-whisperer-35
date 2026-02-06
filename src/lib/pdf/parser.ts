import type { ParsedTransaction, PdfParseResult } from './types';
import { extractStructuredTextFromPdf, type StructuredPage, type StructuredLine } from './textExtractor';
import { parseDateFromLine } from './dateParser';
import { extractAmount, extractAllAmounts } from './amountParser';
import { shouldSkipLine, stripReferencePrefix } from './lineFilters';
import { detectDirection } from './directionDetector';
import { extractMetadata, detectStatementYear } from './metadataExtractor';
import { detectColumnLayout, assignAmountFromColumns, type ColumnLayout } from './columnDetector';

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
 * Attempt column-aware amount extraction using structured segments.
 */
function tryColumnAwareExtraction(
  structuredLine: StructuredLine,
  layout: ColumnLayout,
): { amount: number; direction: 'debit' | 'credit'; description: string } | null {
  if (layout.mode !== 'split') return null;

  const amounts = extractAllAmounts(structuredLine.segments);
  if (amounts.length === 0) return null;

  const result = assignAmountFromColumns(amounts, layout);
  if (!result || result.amount <= 0) return null;

  // Build description from non-amount segments
  // We consider a segment an amount if it was captured in extractAllAmounts
  const amountXPositions = new Set(amounts.map(a => a.x));
  const descSegments = structuredLine.segments.filter(seg => {
    // Skip segments that are amounts or in the balance column
    if (amountXPositions.has(seg.x)) return false;
    if (layout.balanceX && seg.x >= layout.balanceX.min && seg.x <= layout.balanceX.max) return false;
    return true;
  });

  const description = descSegments.map(s => s.text).join(' ').trim();

  return {
    amount: result.amount,
    direction: result.direction,
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

    const transactions: ParsedTransaction[] = [];
    const seenTransactions = new Set<string>();

    for (const page of structuredPages) {
      // Detect column layout for this page
      const layout = detectColumnLayout(page.lines);
      console.log('Column layout:', layout);

      const lines = page.lines;

      for (let i = 0; i < lines.length; i++) {
        const structuredLine = lines[i];
        const lineText = structuredLine.text;

        if (shouldSkipLine(lineText)) continue;

        const parsed = tryParseLine(lineText, contextYear);
        if (!parsed) continue;

        const { date, remainingText } = parsed;

        // ── Strategy 1: Column-aware extraction for split debit/credit ──
        if (layout.mode === 'split') {
          const colResult = tryColumnAwareExtraction(structuredLine, layout);
          if (colResult && colResult.amount > 0) {
            // Extract the description from the date-parsed remaining text
            // (better than from raw segments since it strips dates)
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
        }

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
