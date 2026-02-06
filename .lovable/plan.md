

# Robust Universal PDF Statement Parser

## Problem
The current PDF parser only handles a few specific date and amount formats. It fails on common real-world statements including:
- Scotiabank (Jamaica): `15JUL` dates, `J$ 23,000.00 +` amounts
- Generic credit cards: reference numbers before dates, `$-5,145.78` amounts
- American Express: dates with asterisks (`01/20/06*`)
- Various multi-line transaction layouts

## Solution
Rewrite `src/lib/pdfParser.ts` with a multi-strategy parser that tries different extraction approaches and picks the one that yields the most transactions.

---

## Changes

### 1. Expand Date Parsing (pdfParser.ts)

Add support for these additional date formats the current parser misses:

| Format | Example | Source |
|--------|---------|--------|
| DDMMM (no separator) | `15JUL`, `05AUG` | Scotiabank |
| DDMMMYY | `05JUL24`, `01AUG24` | Scotiabank period |
| DD Mon YYYY | `27 Apr 2018` | Australian statements |
| MM/DD/YY with asterisk | `01/20/06*` | Amex |
| MM/DD (2-digit short) | `10/08`, `1/25` | Credit card samples |

### 2. Expand Amount Extraction (pdfParser.ts)

Add support for these amount formats:

| Format | Example | Source |
|--------|---------|--------|
| Currency prefix + suffix sign | `J$ 23,000.00 +` / `J$ 5,000.00 -` | Scotiabank |
| Dollar-negative prefix | `$-5,145.78` | Amex |
| Negative without dollar | `-168.80` | Credit card sample |
| Large amounts (remove 1M cap) | `J$ 23,000.00` | Jamaican dollar amounts |
| Multiple currency prefixes | `J$`, `A$`, `C$` | International statements |

### 3. Handle Multi-Line Transactions (pdfParser.ts)

The Scotiabank statement has a consistent pattern:
```text
15JUL    THIRD PARTY TRANSFER            J$ 23,000.00 +
         Transfer from DARREN CHAMBERS 9859
```

Improve the multi-line handler to:
- After parsing a transaction, check if the next line starts with whitespace or has no date -- if so, append it to the description
- Continue gathering continuation lines until a new dated line is found

### 4. Handle Reference-Number-Prefixed Lines (pdfParser.ts)

The credit card sample (page 2) has lines like:
```text
483GE7382  1/25        PAYMENT THANK YOU          -168.80
32F349ER3  1/12  1/15  RECORD RECYCLER ANYTOWN    14.83
```

Add logic to strip leading reference/alphanumeric codes before attempting date parsing.

### 5. Add More Skip Patterns (pdfParser.ts)

Add patterns to filter out:
- `OPENING BALANCE`, `CLOSING BALANCE` lines
- `STAMP DUTY`, `WITHHOLDING TAX`, `GCT/GOVT TAX` (government fees shown as separate line items that are already included in the service charge)
- `SERVICE CHARGE DETAILS` section headers
- `FINANCE CHARGE SUMMARY`, `Rate Information` sections
- `Payment Coupon`, `Payment Address` sections
- Lines that are just reference numbers or codes

### 6. Improve Credit/Debit Detection (pdfParser.ts)

Update direction detection to handle:
- `+` suffix = credit (deposit), `-` suffix = debit (withdrawal) -- used by Scotiabank
- Negative amount values = credit (payment) in credit card context
- Add keywords: `THIRD PARTY TRANSFER`, `THIRD PARTY TRF`, `MOBILE OB TRF`, `PREPAID VOUCHER`, `POS PURCHASE`, `PC-BILL PAYMENT`, `INTEREST PAYMENT`

### 7. Improve Metadata Extraction (pdfParser.ts)

Enhance to handle:
- Scotiabank period format: `05JUL24 to 05AUG24`
- Statement date format: `2/13/09` or `11/06/08`
- Account number without masking: `629034`
- Currency detection from `J$` prefix to set appropriate currency

### 8. Pass Currency to Upload Hook (useUploads.ts)

Update the transaction insert to use detected currency from PDF metadata instead of hardcoding `'USD'`. The `PdfParseResult` already has metadata; extend `ParseResult` to optionally carry currency info so the upload hook can use it.

---

## Technical Details

### File Changes

**`src/lib/pdfParser.ts`** -- Major rewrite of parsing logic:
- `parseDateFromLine()`: Add 5 new date format patterns (DDMMM, DDMMMYY, DD Mon YYYY, MM/DD/YY*, strip asterisks)
- `extractAmount()`: Add patterns for currency-prefix+suffix-sign, dollar-negative, raise amount cap to 100M for foreign currencies
- `shouldSkipLine()`: Add ~10 new skip patterns for balance lines, tax lines, section headers
- New `stripReferencePrefix()` function to remove leading alphanumeric codes
- Improve multi-line transaction gathering in the main parse loop
- Add `detectCurrency()` function to identify J$, A$, C$, USD etc.
- Expand `CREDIT_KEYWORDS` and `DEBIT_KEYWORDS` lists

**`src/lib/fileParser.ts`** -- Minor update:
- Add optional `currency` field to `ParseResult` interface
- Pass through currency from PDF parser

**`src/hooks/useUploads.ts`** -- Minor update:
- Use `parseResult.currency` when available instead of hardcoded `'USD'`

### Parsing Strategy

The main parse loop will be enhanced with this flow:

```text
For each line:
  1. Skip if matches skip patterns
  2. Strip reference number prefix (if any)
  3. Try to parse date from start of line
  4. If no date found, skip line
  5. Check for posting date after transaction date
  6. Extract amount (try all patterns)
  7. If no amount, try combining with next line(s)
  8. Gather continuation lines (no-date lines following)
  9. Clean description, detect direction
  10. Deduplicate and add to results
```

### No Database or Schema Changes Required
All changes are purely in the client-side parsing logic.

