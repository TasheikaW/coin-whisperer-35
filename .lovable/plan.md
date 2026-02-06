

# Fix: Descriptions Showing as "J$" Instead of Actual Text

## Problem
When the PDF is parsed, many transaction descriptions show as just "J$" (the Jamaican dollar currency symbol) instead of the actual transaction description like "INTEREST PAYMENT" or "POS PURCHASE - RESTAURANTS OF JA-ECOM KINGSTON 19 JM".

## Root Cause
PDF.js splits text into separate items. In Scotiabank statements, the currency prefix `J$` appears as its own text element positioned near the Credit/Debit columns. In the column assignment logic (`columnExtractor.ts`):

1. `J$` is checked by `isAmountText()` -- it strips `J$` and finds nothing, so returns `false` (not numeric)
2. Since it's not numeric, it falls to the non-numeric text handling
3. It doesn't match the Date or Description column X-positions
4. It ends up being added to `descParts` as if it were description text

For transactions where the actual description text is on a different line or not detected, the description becomes just "J$".

## Fix

### 1. Filter Out Currency-Symbol-Only Tokens (`columnExtractor.ts`)

Add a check in `assignRowToColumns` to detect and skip standalone currency symbols before they can be added to the description. Tokens like `J$`, `A$`, `C$`, `$`, `USD`, `EUR`, etc. should be silently ignored.

A new helper function `isCurrencySymbol()` will be added:

```
J$, A$, C$, US$, HK$  -- currency-letter + dollar sign
$, €, £, ¥             -- standalone symbols  
USD, EUR, GBP, CAD, JMD -- 3-letter ISO codes
```

This check will be placed early in the loop, right after the empty-text check, so currency tokens never reach the description or column assignment logic.

### 2. Remove Incorrect Skip Patterns (`lineFilters.ts`)

Two patterns from the line-based parser are incorrectly filtering out real transactions:

- Line 15: `/^(fees?\s+charged|interest\s+charged)/i` -- "FEES CHARGED" and "INTEREST CHARGED" are real transactions with amounts
- Line 27: `/^(stamp\s+duty|withholding\s+tax|gct|govt\s*tax)/i` -- These are real charges in Jamaican statements

These will be removed so the line-based fallback parser also handles these correctly.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnExtractor.ts` | Add `isCurrencySymbol()` function and use it to skip currency tokens in `assignRowToColumns` |
| `src/lib/pdf/lineFilters.ts` | Remove 2 skip patterns that filter out legitimate transactions |

## Expected Result
After the fix:
- "INTEREST PAYMENT" will show as the description instead of "J$"
- "POS PURCHASE - RESTAURANTS OF JA-ECOM KINGSTON 19 JM" will remain correct
- "WITHHOLDING TAX", "STAMP DUTY", "GCT/GOVT TAX" will appear as transactions
- "FEES CHARGED" and "INTEREST CHARGED" will appear as transactions

