

# Fix: Missing "STAMP DUTY TAX" Transaction (Amount Column Tolerance)

## Problem

The transaction `05AUG STAMP DUTY TAX J$ 1.14 -` is not being picked up. The date parsing and description handling are fine -- the issue is that the **amount "1.14" is not being assigned to the Amount column**.

## Root Cause

PDF statements right-align amounts. The "Amount" column header text is left-aligned (or centered) at some X position. For large amounts like "12,345.67", the text starts far to the left and stays within 40px of the header. But a short amount like "1.14" starts much further to the right because it's right-aligned, putting it **outside** the 40px column tolerance.

When the amount isn't matched to any column, the code treats it as description text (line 222-225 in `columnExtractor.ts`). This means:
- `debitText` stays `null`
- `hasAmount` is `false` in the column parser
- The transaction is created with `amount = 0`
- It gets filtered out at the end: `transactions.filter(t => t.amount > 0)`

## Fix

In `assignRowToColumns` (`columnExtractor.ts`), when a numeric item doesn't match any column within tolerance, apply a smarter fallback: if there are known numeric columns (Amount/Debit/Credit/Balance), assign the unmatched number to the **closest** numeric column instead of dumping it into the description. This handles right-aligned amounts of any length.

Specifically, for unmatched numeric items (lines 218-226):
- Calculate distance to each known numeric column (creditX, debitX, balanceX)
- Assign to the closest one
- This ensures "1.14" at X=420 gets assigned to the Amount column at X=350 even though the distance (70px) exceeds the 40px tolerance, as long as it's the closest column

## Technical Details

### File: `src/lib/pdf/columnExtractor.ts`

Replace the fallback block (lines 218-226) with closest-column assignment:

```
// Numeric but not near any known column -- assign to closest numeric column
const candidates: { col: 'credit' | 'debit' | 'balance'; dist: number }[] = [];
if (layout.creditX !== null) candidates.push({ col: 'credit', dist: Math.abs(item.x - layout.creditX) });
if (layout.debitX !== null) candidates.push({ col: 'debit', dist: Math.abs(item.x - layout.debitX) });
if (layout.balanceX !== null) candidates.push({ col: 'balance', dist: Math.abs(item.x - layout.balanceX) });

if (candidates.length > 0) {
  candidates.sort((a, b) => a.dist - b.dist);
  const closest = candidates[0];
  if (closest.col === 'balance') balanceText = text;
  else if (closest.col === 'credit') creditText = text;
  else debitText = text;
} else {
  descParts.push(text);
}
```

This way, any numeric value that doesn't fall within the standard 40px tolerance still gets assigned to the correct column based on proximity, instead of being lost into the description.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnExtractor.ts` | Replace fallback for unmatched numeric items: assign to closest column instead of description |

## Expected Result
- "05AUG STAMP DUTY TAX J$ 1.14 -" will be parsed as: date=2024-08-05, description="STAMP DUTY TAX", amount=1.14, direction=debit
- All other transactions continue to work as before (the within-tolerance check still takes priority)

