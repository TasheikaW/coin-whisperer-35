

# Fix PDF Column Detection to Correctly Extract Only Date, Description, and Amount

## Problem

The current parser is picking up **Balance column** values as transaction amounts and mangling descriptions. For example:

| Expected | What parser produces |
|----------|---------------------|
| THIRD PARTY TRF BNS: J$ 5,000.00 (debit) | Amount = 18,449.42 (this is the balance!) |
| GCT/GOVT TAX: J$ 4.14 (debit) | Amount = 17,029.68 (this is the balance!) |
| INTEREST PAYMENT: J$ 4.54 (credit) | Description = "J$" (amount stripped, balance used) |

**Root causes:**
1. Column header detection runs per-page, but headers only appear on one page -- other pages fall back to unreliable "single" mode
2. The 40px tolerance makes Credit and Debit column ranges overlap (creditX max=427, debitX min=395)
3. When column detection fails, the parser grabs the last number on the line which is often the Balance
4. Skip patterns incorrectly filter out valid transactions like STAMP DUTY TAX, WITHHOLDING TAX, GCT/GOVT TAX

## Solution

### 1. Global column detection across all pages

**File: `src/lib/pdf/columnDetector.ts`**

Instead of detecting columns per-page (which fails when headers are only on one page), scan ALL pages first and use the best layout found for the entire document.

- Add a new function `detectGlobalColumnLayout(pages)` that scans every page and returns the first valid split-mode layout found
- If no split layout is found across any page, return single mode
- This ensures pages without headers still get the correct column assignments

### 2. Fix overlapping column ranges

**File: `src/lib/pdf/columnDetector.ts`**

- Reduce the default tolerance from 40px to 20px to prevent Credit and Debit ranges from overlapping
- Add overlap validation: if debitX and creditX ranges overlap, adjust them so they don't (use the midpoint as the boundary)
- Use the actual segment width more accurately instead of adding large padding

### 3. Exclude balance column more aggressively

**File: `src/lib/pdf/columnDetector.ts`** and **`src/lib/pdf/parser.ts`**

- When balance column is detected, any amount whose X position is to the right of BOTH the credit and debit columns should be excluded
- In `assignAmountFromColumns`: if an amount doesn't match any known column (debit/credit), skip it entirely in split mode instead of defaulting to debit

### 4. Remove incorrect skip patterns

**File: `src/lib/pdf/lineFilters.ts`**

Remove these patterns that incorrectly skip valid transactions:
- `STAMP DUTY` -- this is a real transaction
- `WITHHOLDING TAX` -- this is a real transaction
- `GCT/GOVT TAX` -- this is a real transaction

Keep skip patterns only for section headers like "SERVICE CHARGE DETAILS" (not "SERVICE CHARGE" which is a transaction).

### 5. Improve description cleaning in split-column mode

**File: `src/lib/pdf/parser.ts`**

When in split-column mode, the description should be built by:
- Taking text segments that are NOT in the credit, debit, or balance column ranges
- Stripping currency prefixes like "J$" from the description
- Not concatenating amount values into descriptions

---

## Technical Details

### Changes to `src/lib/pdf/columnDetector.ts`

1. Add `detectGlobalColumnLayout(allPages)` function:
   - Iterates through all pages' lines
   - Returns the first split-mode layout detected
   - Falls back to single mode if none found

2. Reduce tolerance in `segmentRange()` from 40 to 20

3. Add overlap resolution in `detectColumnLayout()`:
   - After detecting ranges, check if debitX and creditX overlap
   - If they do, set the boundary at the midpoint between them

4. In `assignAmountFromColumns()`:
   - When mode is split but amount doesn't match debit or credit range, return null (don't default to debit)
   - Add a "rightmost column exclusion" -- if balance wasn't explicitly detected, treat the rightmost amount column as balance and exclude it

### Changes to `src/lib/pdf/lineFilters.ts`

Remove these regex patterns from SKIP_PATTERNS:
- `/^(stamp\s+duty|withholding\s+tax|gct|govt\s*tax)/i`

Make the "service charge details" pattern more specific so it only matches the section header, not individual "SERVICE CHARGE" transactions.

### Changes to `src/lib/pdf/parser.ts`

1. Replace per-page `detectColumnLayout(page.lines)` with a single global layout detection at the start

2. In `tryColumnAwareExtraction()`:
   - Build description only from segments whose X position falls BEFORE the credit/debit columns
   - Strip "J$", "A$", "C$" prefixes from description segments
   - Don't include amount-like text in the description

3. In the main parse loop, when split mode is active:
   - If column-aware extraction succeeds, use it exclusively (don't fall through to Strategy 2)
   - If it fails (no amount in credit/debit column), skip the line rather than guessing

### Files Changed

| File | Type of Change |
|------|---------------|
| `src/lib/pdf/columnDetector.ts` | Add global detection, fix tolerance, fix overlap, fix fallback |
| `src/lib/pdf/lineFilters.ts` | Remove 1 skip pattern that filters valid transactions |
| `src/lib/pdf/parser.ts` | Use global layout, improve description building, fix Strategy 1 |

### No database changes required

All changes are client-side parsing logic only.
