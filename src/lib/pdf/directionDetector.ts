/**
 * Keywords that indicate a payment / credit / income transaction.
 */
const CREDIT_KEYWORDS = [
  'payment', 'thank you', 'refund', 'credit', 'return', 'reversal',
  'cashback', 'reward', 'reimbursement', 'deposit', 'rebate',
  'adjustment cr', 'cr adj',
  'third party transfer', 'third party trf',
  'mobile ob trf', 'prepaid voucher',
  'pc-bill payment', 'interest payment',
  'payment received', 'payment - thank',
];

/**
 * Detect debit vs credit based on description keywords and raw flags.
 *
 * @param signFromSuffix  If the amount line had an explicit +/- suffix (Scotiabank style)
 *                        the caller should pass '+' or '-' here. This takes precedence.
 */
export function detectDirection(
  description: string,
  rawIsCredit: boolean,
  signFromSuffix?: '+' | '-',
): 'debit' | 'credit' {
  // Explicit +/- from Scotiabank-style suffix
  if (signFromSuffix === '+') return 'credit';
  if (signFromSuffix === '-') return 'debit';

  const lower = description.toLowerCase();

  for (const keyword of CREDIT_KEYWORDS) {
    if (lower.includes(keyword)) return 'credit';
  }

  if (rawIsCredit) return 'credit';

  return 'debit';
}
