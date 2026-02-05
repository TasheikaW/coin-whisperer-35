

# Simplify Parser: Import Raw Amounts, Derive Direction from Sign

## Current Problem

The parser has complex logic trying to detect debit/credit columns with keyword matching that causes false positives (e.g., "Description" matching "in" keyword). This leads to missed transactions.

## New Approach: Keep It Simple

**Import the raw amount with its original sign, then derive direction purely from the sign:**
- **Positive amount in file → `credit`**
- **Negative amount in file → `debit`**

No keyword detection for debit/credit columns. No Method 2. Just find the amount column and use its sign.

## Changes to `src/lib/fileParser.ts`

### 1. Remove debit/credit column detection entirely

**Lines 138-142**: Remove the debitKeywords, creditKeywords, and their column detection:

```typescript
// DELETE these lines:
const debitKeywords = ['debit', 'withdrawal', 'out', 'dr', 'expense', 'spent'];
const creditKeywords = ['credit', 'deposit', 'in', 'cr', 'income', 'received'];
const debitCol = findColumn(debitKeywords);
const creditCol = findColumn(creditKeywords, ['debit']);
```

### 2. Simplify the returned columns object

**Lines 159-168**: Remove `debitCol` and `creditCol` from the return object:

```typescript
return {
  dateCol: dateCol >= 0 ? dateCol : 0,
  descCol,
  descCol2,
  amountCol,
  balanceCol,
  typeCol,
  accountTypeCol,
};
```

### 3. Remove Method 2 (separate debit/credit columns) from parseCSV

**Lines 285-297**: Delete the entire Method 2 block that tries to read from separate debit/credit columns.

### 4. Simplify Method 1 and Method 3 logic

**Method 1 (lines 271-283)**: 
```typescript
// Method 1: Single amount column - use sign directly
if (columns.amountCol >= 0) {
  const rawAmount = parseAmount(values[columns.amountCol]);
  if (rawAmount !== null) {
    amount = rawAmount; // Keep original sign
    direction = rawAmount < 0 ? 'debit' : 'credit';
  }
}
```

**Method 3 fallback (lines 299-311)**: Same simplification - just use the raw sign.

### 5. Apply same changes to parseXLSX function

Apply identical simplifications to the XLSX parsing logic.

## Summary of Changes

| Location | Change |
|----------|--------|
| Lines 138-142 | Remove debit/credit keyword lists and column detection |
| Lines 159-168 | Remove debitCol/creditCol from returned columns object |
| Lines 285-297 | Delete Method 2 entirely |
| Method 1 & 3 | Use raw amount sign to determine direction |
| parseXLSX | Apply same simplifications |

## Result

After this change:
- Parser only looks for: **date**, **description**, **amount** columns
- Direction is determined purely by the sign in the file
- `1750` (positive) → stored as `credit` → displays as `+$1,750`
- `-183.46` (negative) → stored as `debit` → displays as `-$183.46`
- No more false-positive keyword matching causing transactions to be skipped

## After Implementation

1. Delete existing transactions from the problematic upload
2. Re-upload the file to verify all transactions import correctly

