

# Fix PDF Parser: False Split Detection and Balance Column Leakage

## Root Cause

Three issues prevent this Scotiabank PDF from parsing:

1. The section title "Transactions ( Withdrawals & Deposits )" is incorrectly detected as column headers because PDF.js splits it into short segments like "Withdrawals" and "Deposits" that match debit/credit keywords. This falsely activates split-column mode, which then skips every transaction because no amounts fall in the expected column ranges.

2. Even after fixing the false split detection, the parser would grab Balance column values as transaction amounts. In single-column mode, `extractAmount()` matches the LAST number on the line (the balance), not the transaction amount with the `+/-` suffix.

3. `extractAllAmounts()` strips the `+/-` sign from amounts, losing debit/credit direction information needed for column-aware extraction in single mode.

## Changes

### 1. Skip title/section header lines in column detection

**File: `src/lib/pdf/columnDetector.ts`**

In `detectColumnLayout()`, skip lines whose text contains parentheses (e.g., "Transactions ( Withdrawals & Deposits )"). Real table column headers virtually never use parentheses around keywords, so this safely filters out section titles.

### 2. Preserve sign info in extractAllAmounts

**File: `src/lib/pdf/amountParser.ts`**

Update `PositionedAmount` to include an optional `sign` field (`'+' | '-'`). Before stripping the text, check if the raw segment ends with `+` or `-` and preserve that info.

### 3. Enable column-aware extraction in single mode

**File: `src/lib/pdf/parser.ts`**

Currently `tryColumnAwareExtraction()` only works when mode is `'split'`. Update it to also work in single mode when a balance column has been detected:

- Get all amounts with positions
- Filter out amounts in the balance column range
- Use the first remaining amount
- Use preserved sign info for direction ('+' = credit, '-' = debit)
- Fall back to keyword-based direction detection if no sign info

This prevents the balance value from ever being used as the transaction amount.

---

## Technical Details

### `src/lib/pdf/columnDetector.ts`

Add a line-level check at the start of the scanning loop:

```text
for (const line of linesToScan) {
  // NEW: Skip lines with parentheses - these are section titles, not headers
  if (/\(.*\)/.test(line.text)) continue;
  // ... rest of existing detection
}
```

### `src/lib/pdf/amountParser.ts`

Extend PositionedAmount:

```text
export interface PositionedAmount {
  amount: number;
  x: number;
  sign?: '+' | '-';  // NEW: preserved from suffix
}
```

In `extractAllAmounts()`, detect sign before stripping:

```text
const trimText = text.trim();
let sign: '+' | '-' | undefined;
if (trimText.endsWith('+')) sign = '+';
else if (trimText.endsWith('-')) sign = '-';
// ... existing parsing ...
results.push({ amount, x: seg.x, sign });
```

### `src/lib/pdf/parser.ts`

Update `tryColumnAwareExtraction()` to handle single mode:

```text
function tryColumnAwareExtraction(structuredLine, layout) {
  // NEW: Also work in single mode when balance column is detected
  if (layout.mode !== 'split' && !layout.balanceX) return null;

  const amounts = extractAllAmounts(structuredLine.segments);
  if (amounts.length === 0) return null;

  if (layout.mode === 'split') {
    // Existing split mode logic (unchanged)
    ...
  } else {
    // Single mode with balance column knowledge
    // Filter out balance column amounts
    const filtered = amounts.filter(a => !isInRange(a.x, layout.balanceX));
    if (filtered.length === 0) return null;

    // Use the first non-balance amount
    const main = filtered[0];

    // Use preserved sign for direction
    let direction: 'debit' | 'credit' = 'debit';
    if (main.sign === '+') direction = 'credit';
    else if (main.sign === '-') direction = 'debit';

    // Build description from non-amount, non-balance segments
    ...
    return { amount: main.amount, direction, description };
  }
}
```

Update the main parse loop to also try column-aware extraction in single mode (when balance column is known):

```text
// Try column-aware extraction (works for both split AND single-with-balance)
const colResult = tryColumnAwareExtraction(structuredLine, globalLayout);
if (colResult && colResult.amount > 0) {
  // ... add transaction
  continue;
}

// If split mode and column-aware failed, skip (don't guess)
if (globalLayout.mode === 'split') continue;

// Fall through to Strategy 2 only if no column info available
```

### Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnDetector.ts` | Skip parenthetical lines in column detection |
| `src/lib/pdf/amountParser.ts` | Preserve sign info in PositionedAmount |
| `src/lib/pdf/parser.ts` | Enable column-aware extraction in single mode with balance filtering |

### No database changes required

All changes are in client-side parsing logic only.

