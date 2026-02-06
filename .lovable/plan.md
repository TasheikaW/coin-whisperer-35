

# Find Table Headers First, Then Extract Transactions Below

## What This Solves

Right now the parser processes **every line** in the PDF and tries to determine if it's a transaction. This causes it to pick up junk from the preamble (account info, addresses, legal text) and miss the actual transaction table structure.

Your Scotiabank PDF has a clear structure:
- A section title: "Transactions ( Withdrawals & Deposits ) - 629034"
- A **table header row**: "Transaction Date | Description | Amount | Balance"
- A **sub-header row**: "CREDIT | DEBIT" (under the Amount column)
- Then the actual transaction rows

The fix: scan each page for the table header row first, then **only parse lines below it**. This also naturally gives us column positions for Amount vs Balance.

---

## Changes

### 1. Add Table Header Detection

**File: `src/lib/pdf/columnDetector.ts`**

Add a new function `findTableHeaderLine()` that scans through lines looking for a row containing table header keywords:

- **Date keywords**: "transaction date", "trans date", "date", "posting date", "value date"
- **Description keywords**: "description", "details", "particulars", "narrative"

A line is considered a table header if it contains **at least one date keyword AND one description keyword**. This is very specific and won't match random text.

When found, it also:
- Records the **line index** where the header was found
- Scans the next 1-2 lines for sub-headers (CREDIT/DEBIT under Amount)
- Records column positions (Amount, Balance, Credit, Debit) from both the header and sub-header rows
- Returns the index of the **first line after all headers** (so the parser knows where to start)

### 2. Update Column Layout to Include Start Line

**File: `src/lib/pdf/columnDetector.ts`**

Extend `ColumnLayout` to include:
- `tableStartLine`: the line index where transactions begin (right after the header rows)
- `headerPageIndex`: which page the header was found on

Update `detectGlobalColumnLayout()` to use `findTableHeaderLine()` on each page and return the enriched layout.

### 3. Update Parser to Start After Headers

**File: `src/lib/pdf/parser.ts`**

Update the main parsing loop:
- On the page where the header was found: skip all lines before `tableStartLine`
- On pages **after** the header page: start from line 0 (transactions continue)
- On pages **before** the header page: skip entirely (preamble)
- If no header was found on any page: fall back to existing behaviour (parse all lines) for backwards compatibility with other statement formats

Also add **end-of-table detection**: stop parsing when hitting lines like "CLOSING BALANCE", "OPENING BALANCE" at the end, or similar summary markers.

---

## Technical Details

### New Function: `findTableHeaderLine()`

```text
Input: StructuredLine[] (all lines on a page)
Output: {
  headerLineIndex: number,       -- where the header row is (-1 if not found)
  tableStartLine: number,        -- first line after all header/sub-header rows
  layout: ColumnLayout           -- column positions extracted from headers
}

Logic:
  For each line:
    1. Check segments for date keywords ("transaction date", "date", etc.)
    2. Check segments for description keywords ("description", "details", etc.)
    3. If BOTH found on the same line -> this is the table header
    4. Record positions of "Amount", "Balance" from this line
    5. Scan next 1-2 lines for "CREDIT"/"DEBIT" sub-headers
    6. If sub-headers found -> split mode, record their positions
    7. tableStartLine = last header/sub-header line index + 1
```

### Updated Main Parse Loop

```text
Before (current):
  for each page:
    for each line on page:
      try to parse as transaction...

After (new):
  globalLayout = detectGlobalColumnLayout(pages)  -- now includes header info
  
  for each page (index p):
    if p < headerPageIndex: skip entire page
    if p == headerPageIndex: start from tableStartLine
    if p > headerPageIndex: start from line 0
    
    for each line (starting from determined start):
      if line matches end-of-table marker: stop
      try to parse as transaction...
```

### End-of-Table Markers

Lines that signal the end of the transaction table:
- "CLOSING BALANCE"
- "TOTAL DEBITS"
- "TOTAL CREDITS"
- Lines that are just a balance amount with no date/description

### Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnDetector.ts` | Add `findTableHeaderLine()`, extend `ColumnLayout` with start-line info, update global detection |
| `src/lib/pdf/parser.ts` | Use header-based start line, add end-of-table detection |

### Backwards Compatibility

If no table header is found in the PDF (e.g., some credit card statements don't have a clear header row), the parser falls back to its current behaviour of scanning all lines. This ensures other statement formats continue to work.

### No database or backend changes required

All changes are in client-side parsing logic only.

