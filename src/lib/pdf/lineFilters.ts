/**
 * Patterns for lines that should be skipped — headers, footers, summaries, legal text, etc.
 */
const SKIP_PATTERNS: RegExp[] = [
  /^page\s+\d+/i,
  /^statement\s+(date|period|of\s+account)/i,
  /^\s*date\s+description\s+/i,
  /^\s*date\s+transaction\s+/i,
  /^(opening|closing|previous|new)\s+balance/i,
  /^(total|subtotal)\s+(purchases|payments|debits|credits|charges)/i,
  /^(minimum\s+payment|amount\s+due|payment\s+due)/i,
  /^(credit\s+limit|available\s+credit|cash\s+advance)/i,
  /^(annual\s+percentage|interest\s+rate|daily\s+periodic)/i,
  /^(thank\s+you\s+for|important\s+information|notice)/i,
  /^(fees?\s+charged|interest\s+charged)/i,
  /^\s*\d+\s*$/,               // Just a number (page numbers)
  /^(rewards|points|miles)\s/i,
  /^\*+/,                       // Lines starting with asterisks
  /^[-=]{3,}/,                  // Separator lines
  /^(continued|carried\s+forward)/i,
  /^(please\s+note|note:|important:)/i,
  /^(questions\?|customer\s+service|call\s+us)/i,
  /^trans\.?\s*date\s+post/i,
  /^(account\s+summary|account\s+activity)/i,
  /^(your\s+account|account\s+number)/i,
  // ── New patterns ──
  // Note: STAMP DUTY, WITHHOLDING TAX, GCT/GOVT TAX are real transactions — do NOT skip them
  /^(service\s+charge\s+details)/i,
  /^(finance\s+charge\s+summary|rate\s+information)/i,
  /^(payment\s+coupon|payment\s+address|remittance)/i,
  /^(balance\s+brought\s+forward|balance\s+carried)/i,
  /^(opening|closing)\s+bal/i,
  /^(beginning|ending)\s+balance/i,
  /^(previous\s+statement|last\s+statement)/i,
  /^(transactions?\s+(?:summary|details|listing))/i,
  /^(purchases?\s+and\s+adjustments)/i,
  /^(payments?\s+and\s+(?:other\s+)?credits)/i,
  /^(fees?\s*$)/i,
  /^(interest\s*$)/i,
  /^[A-Z]{2,}\s*$/,             // Solo short uppercase codes
];

/**
 * Return true when the line should be skipped (not a transaction).
 */
export function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return true;
  return SKIP_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Strip a leading reference / alphanumeric code that some statements prepend.
 * e.g.  "483GE7382  1/25  PAYMENT THANK YOU  -168.80"
 *       → "1/25  PAYMENT THANK YOU  -168.80"
 *
 * Only strips if it looks like a reference (mix of digits + letters, 5-12 chars)
 * followed by whitespace and then something that starts with a digit (date).
 */
export function stripReferencePrefix(line: string): string {
  const match = line.match(/^([A-Z0-9]{5,12})\s{2,}(\d)/i);
  if (match) {
    return line.slice(match[1].length).trim();
  }
  return line;
}
