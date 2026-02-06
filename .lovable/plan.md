

# Merge Debit/Credit Columns and Improve Column-Aware PDF Parsing

## What This Solves

Currently, the PDF parser processes text line-by-line and looks for a single amount at the end of each line. This fails when a PDF statement uses **separate Debit and Credit columns** (a common layout in bank statements), because:

- Two amounts may appear on the same line (one in the Debit column, one in the Credit column)
- A Balance column amount may also appear, and the parser can't distinguish it from the transaction amount
- The parser doesn't know which column an amount belongs to, so it may pick the wrong one

The fix: make the PDF text extractor **column-aware** so the parser can detect column headers (Debit, Credit, Amount, Balance) and correctly assign amounts based on their position.

This also applies to the CSV/XLSX parser, which currently has no support for separate Debit/Credit columns either.

---

## Changes

### 1. Enhance PDF Text Extractor with Column Position Data

**File: `src/lib/pdf/textExtractor.ts`**

- Add a new `StructuredLine` type that includes text segments with their X positions (not just flattened strings)
- Add a new export function `extractStructuredTextFromPdf()` that returns both plain text lines and the structured data with X positions
- The parser can then determine which column an amount falls under

### 2. Add Column Header Detection to PDF Parser

**File: `src/lib/pdf/parser.ts`** (new helper + main parse loop changes)

- Before processing transaction lines, scan for header rows that contain column labels like "Debit", "Credit", "Withdrawal", "Deposit", "Amount", "Balance", "Charges", "Credits"
- Record the X-position ranges of each detected column header
- Create a `ColumnLayout` object: `{ debitRange, creditRange, amountRange, balanceRange }`
- If separate Debit/Credit columns are detected, switch to column-aware mode

### 3. Column-Aware Amount Extraction

**File: `src/lib/pdf/amountParser.ts`**

- Add a new function `extractAllAmounts(text, segments)` that finds ALL amounts on a line along with their X positions
- The parser uses this with the column layout to:
  - Pick the amount from the Debit or Credit column (whichever has a value)
  - Set direction based on which column it came from (Debit column = debit, Credit column = credit)
  - Ignore amounts in the Balance column

### 4. Update Parser Main Loop

**File: `src/lib/pdf/parser.ts`**

The main parsing loop will be updated:

- Phase 1: Extract structured text with positions
- Phase 2: Detect column layout from headers
- Phase 3: For each transaction line:
  - If column-aware mode (separate Debit/Credit columns detected):
    - Find all amounts and their X positions
    - Match each amount to a column header
    - Use the Debit or Credit column amount as the transaction amount
    - Direction comes from which column
  - If single-column mode (Amount column or +/- suffix):
    - Use existing logic (unchanged)

### 5. Add Debit/Credit Column Support to CSV/XLSX Parser

**File: `src/lib/fileParser.ts`**

- Add `debitCol` and `creditCol` to the `ColumnMapping` interface
- Update `detectColumns()` to find columns named "debit", "withdrawal", "charges" and "credit", "deposit", "payments"
- In `parseCSV()` and `parseXLSX()`, when separate debit/credit columns are found:
  - Check both columns for a value
  - Use whichever has a non-zero value as the amount
  - Set direction based on which column it came from
  - This makes CSV/XLSX handling consistent with the new PDF logic

---

## Technical Details

### New Types

```text
StructuredLine {
  text: string              -- full line text (same as before)
  segments: Array<{
    text: string
    x: number               -- X position in PDF coordinates
    width: number            -- approximate width
  }>
}

ColumnLayout {
  mode: 'single' | 'split'  -- single Amount vs separate Debit/Credit
  debitX?: { min, max }
  creditX?: { min, max }
  amountX?: { min, max }
  balanceX?: { min, max }
}
```

### Column Detection Logic

```text
For each line in the first 30 lines of each page:
  1. Check if line contains column header keywords
  2. If "debit"/"withdrawal" AND "credit"/"deposit" found at different X positions:
     -> mode = 'split', record their X ranges
  3. If "amount" found (without split columns):
     -> mode = 'single', record amount X range
  4. Always record "balance" X range to exclude it
```

### Amount Assignment in Split Mode

```text
For each amount found on a transaction line:
  - If amount's X position overlaps with debitX range -> direction = 'debit'
  - If amount's X position overlaps with creditX range -> direction = 'credit'
  - If amount's X position overlaps with balanceX range -> skip (ignore)
  - If no column match -> fall back to existing sign-based logic
```

### Files Changed

| File | Change Type |
|------|-------------|
| `src/lib/pdf/textExtractor.ts` | Add structured line extraction with X positions |
| `src/lib/pdf/amountParser.ts` | Add multi-amount extraction with positions |
| `src/lib/pdf/parser.ts` | Add column detection + column-aware parsing loop |
| `src/lib/fileParser.ts` | Add debit/credit column support to CSV/XLSX |

### No database or schema changes required

All changes are purely in client-side parsing logic.

