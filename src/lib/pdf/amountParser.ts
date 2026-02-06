import type { TextSegment } from './textExtractor';

/**
 * Extract an amount (and its credit/debit signal) from the end of a text line.
 *
 * Supported formats:
 *   $1,234.56   1234.56   -1234.56   $-5,145.78
 *   1,234.56 CR / DR
 *   (1,234.56)
 *   J$ 23,000.00 +   /   J$ 5,000.00 -
 *   -168.80
 *   A$ / C$ / € prefixes
 */
export function extractAmount(
  text: string,
): { amount: number; description: string; isCredit: boolean; signFromSuffix?: '+' | '-' } | null {
  const patterns: {
    regex: RegExp;
    handler: (match: RegExpMatchArray, text: string) => ReturnType<typeof extractAmount>;
  }[] = [
    // ── Currency-prefix with +/- suffix  (Scotiabank style) ──
    // e.g.  "J$ 23,000.00 +"  or  "J$ 5,000.00 -"
    {
      regex: /\s+(?:[A-Z]{1,3}\$?\s*)?(\$?\s*[\d,]+\.\d{2})\s*(\+|-)\s*$/,
      handler: (m, t) => {
        const amountStr = m[1].replace(/[$,\s]/g, '');
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return null;
        const sign = m[2] as '+' | '-';
        const descEnd = t.lastIndexOf(m[0].trim());
        return {
          amount,
          description: t.slice(0, descEnd).trim(),
          isCredit: sign === '+',
          signFromSuffix: sign,
        };
      },
    },
    // ── Dollar-negative prefix  e.g. $-5,145.78 ──
    {
      regex: /\s+\$-([\d,]+\.\d{2})\s*$/,
      handler: (m, t) => {
        const amount = parseFloat(m[1].replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return null;
        const descEnd = t.lastIndexOf(m[0].trim());
        return { amount, description: t.slice(0, descEnd).trim(), isCredit: false };
      },
    },
    // ── Amount with CR/DR suffix ──
    {
      regex: /\s+([-]?\$?[\d,]+\.\d{2})\s*(CR|DR|cr|dr)\s*$/,
      handler: (m, t) => {
        const amount = parseFloat(m[1].replace(/[$,]/g, ''));
        if (isNaN(amount) || amount <= 0) return null;
        const descEnd = t.lastIndexOf(m[0].trim());
        return {
          amount: Math.abs(amount),
          description: t.slice(0, descEnd).trim(),
          isCredit: m[2].toUpperCase() === 'CR',
        };
      },
    },
    // ── Parenthesized negative  (1,234.56) ──
    {
      regex: /\s+\(\$?([\d,]+\.\d{2})\)\s*$/,
      handler: (m, t) => {
        const amount = parseFloat(m[1].replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return null;
        const descEnd = t.lastIndexOf(m[0].trim());
        return { amount, description: t.slice(0, descEnd).trim(), isCredit: false };
      },
    },
    // ── Generic trailing amount  (with optional currency prefix: J$, A$, C$, $) ──
    {
      regex: /\s+(?:[A-Z]{1,3})?\$?\s*([-]?[\d,]+\.\d{2})\s*$/,
      handler: (m, t) => {
        const raw = parseFloat(m[1].replace(/,/g, ''));
        if (isNaN(raw)) return null;
        const amount = Math.abs(raw);
        if (amount <= 0) return null;
        const descEnd = t.lastIndexOf(m[0].trim());
        return {
          amount,
          description: t.slice(0, descEnd).trim(),
          isCredit: raw < 0,
        };
      },
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = text.match(regex);
    if (match) {
      const result = handler(match, text);
      // Allow amounts up to 100 million (for foreign currencies like JMD)
      if (result && result.amount > 0 && result.amount < 100_000_000) {
        return result;
      }
    }
  }

  return null;
}

/**
 * A parsed amount with its X position for column-aware matching.
 */
export interface PositionedAmount {
  amount: number;
  x: number;
  sign?: '+' | '-';
}

/**
 * Amount pattern for extracting all numeric amounts from segments.
 * Matches common amount formats: 1,234.56, $1234.56, -500.00, etc.
 */
const AMOUNT_REGEX = /^[($-]*\$?\s*-?\s*[\d,]+\.\d{2}\s*[)+-]?\s*$/;

/**
 * Extract ALL amount-like values from a line's segments, each with its X position.
 * Used in column-aware mode to match amounts to debit/credit/balance columns.
 */
export function extractAllAmounts(segments: TextSegment[]): PositionedAmount[] {
  const results: PositionedAmount[] = [];

  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text) continue;

    // Check if the segment looks like a number/amount
    if (AMOUNT_REGEX.test(text)) {
      // Detect +/- suffix before stripping (Scotiabank style: "5,000.00 +" or "5,000.00 -")
      let sign: '+' | '-' | undefined;
      if (text.endsWith('+')) sign = '+';
      else if (text.endsWith('-')) sign = '-';

      const cleaned = text
        .replace(/[$(),\s]/g, '')
        .replace(/\+$/, '')
        .replace(/-$/, (m) => m); // Keep trailing minus for now

      // Handle trailing minus: "500.00-" -> "-500.00"
      let numStr = cleaned;
      if (numStr.endsWith('-')) {
        numStr = '-' + numStr.slice(0, -1);
      }

      const amount = parseFloat(numStr);
      if (!isNaN(amount) && Math.abs(amount) > 0 && Math.abs(amount) < 100_000_000) {
        results.push({ amount: Math.abs(amount), x: seg.x, sign });
      }
    }
  }

  return results;
}
