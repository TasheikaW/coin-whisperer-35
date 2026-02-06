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
