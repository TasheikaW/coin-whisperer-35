

# Fix: Import Transaction Signs Exactly As They Appear in File

## Problem Identified

Your bank statement has the correct sign convention:
- **Positive amounts** (e.g., 1750) = credits (payments/refunds)
- **Negative amounts** (e.g., -183.46) = debits (purchases)

The parser logic at line 279 (`direction = rawAmount < 0 ? 'debit' : 'credit'`) is correct for this format. However, the PAYMENT transactions are still being stored as `debit` in the database.

**Root Cause**: The keyword `'payment'` is included in `debitKeywords` (line 139), which could cause the parser to detect a debit column incorrectly if any header contains "payment".

Additionally, looking at your file headers:
- `Account | Account | Transac | Cheque | Description 1 | Description 2 | CAD$`

The column detection might be failing to find the `CAD$` amount column properly, causing it to fall through to Method 2 or Method 3 which have different logic.

## Solution

### 1. Remove 'payment' from debitKeywords
The word "payment" doesn't belong in debit keywords - it's ambiguous and can cause false matches.

**File**: `src/lib/fileParser.ts`  
**Line 139**: Remove 'payment' from the array

```typescript
// Before
const debitKeywords = ['debit', 'withdrawal', 'out', 'dr', 'expense', 'payment', 'spent'];

// After
const debitKeywords = ['debit', 'withdrawal', 'out', 'dr', 'expense', 'spent'];
```

### 2. Ensure consistent sign handling across all methods
Method 2 (separate debit/credit columns) forces all debit values to `direction = 'debit'` regardless of the sign in the file. This overrides the user's preferred behavior.

**Lines 285-296**: Method 2 should be skipped if we already found an amount via Method 1, or we should apply the same sign-based logic.

### 3. Add console logging to debug column detection (temporary)
To verify what columns are being detected, add logging to help identify the issue.

## Changes Summary

| File | Change |
|------|--------|
| `src/lib/fileParser.ts` line 139 | Remove 'payment' from `debitKeywords` |
| Ensure Method 1 handles your file correctly | Verify `CAD$` column is detected as `amountCol` |

## After Implementation

1. **Delete existing transactions** from the current upload
2. **Re-upload the file** - the parser should now correctly interpret:
   - `1750` (positive) → `credit` → displays `+$1,750`
   - `-183.46` (negative) → `debit` → displays `-$183.46`

## Technical Details

The core logic `direction = rawAmount < 0 ? 'debit' : 'credit'` is already correct. The issue is likely that:
1. The `amountCol` detection is failing for `CAD$` 
2. OR the `debitCol` is being triggered by something in the headers
3. Which causes Method 2 to run instead of Method 1, overriding the sign-based direction

Removing 'payment' from debitKeywords and ensuring consistent column detection should resolve this.

