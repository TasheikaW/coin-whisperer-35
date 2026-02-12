

# Fix: Remove All Symbols/Numbers from Transaction Descriptions

## Root Cause

The Scotiabank statement has columns "Transaction Date | Transaction Description | **Amount** | Balance". The column detector only looks for "Credit" / "Debit" headers -- it does NOT recognize "Amount" as a valid column. So the column parser is skipped entirely, and the **line-based parser** is used instead.

The line-based parser has two problems:
1. It joins multi-line descriptions with `" -- "` (em-dash) instead of a space
2. Its `cleanDescription` function does NOT strip currency symbols like `J$`, standalone numbers, or symbols

Additionally, the text extractor snaps Y positions to 1px precision. PDF items that are visually on the same row but differ by ~1px in Y get split into separate lines. This causes `J$` (which sits near the Amount column) to appear as its own "line", which then gets treated as description text.

## Changes

### 1. Enhance Column Detection (`src/lib/pdf/columnExtractor.ts`)

Update `detectColumnLayout` to also recognize `"Amount"` as a valid column header. When found, map it to the `debitX` position (the `+`/`-` suffix will determine credit vs debit during parsing). This lets the column parser handle Scotiabank-style statements correctly.

The detection condition changes from requiring two of (credit, debit, balance) to also accepting (amount + balance) or (amount + date).

### 2. Handle Single "Amount" Column in Column Parser (`src/lib/pdf/columnParser.ts`)

When the layout has a single "Amount" column (debitX set, creditX null), check the raw amount text for `+` or `-` suffix to determine direction. Currently the parser assumes separate credit/debit columns.

### 3. Fix Line-Based Parser Descriptions (`src/lib/pdf/parser.ts`)

As a fallback safety net:
- Change `descParts.join(' -- ')` to `descParts.join(' ')` (space, not em-dash)
- Update `cleanDescription` to strip currency symbols (`J$`, `US$`, `$`, etc.), standalone numbers, and standalone symbols -- matching the same logic as `cleanMergedDescription` in the column parser
- Apply the same cleaning to the combined-line path too

### 4. Improve Text Extractor Y-Snapping (`src/lib/pdf/textExtractor.ts`)

Change Y-position snapping from 1px (`Math.round`) to 2px (`Math.round(y / 2) * 2`) to match the column extractor. This prevents items on the same visual row from splitting into separate lines due to sub-pixel Y differences.

## Technical Details

### columnExtractor.ts -- detect "Amount" header

```
// In detectColumnLayout, add:
const hasAmount = rowItems.find(i =>
  /^amount/i.test(i.text.trim())
);

// Expand the condition:
if ((hasCredit && hasDebit) || (hasCredit && hasBalance) || (hasDebit && hasBalance)
    || (hasAmount && hasBalance) || (hasAmount && hasDate)) {
  // Map "Amount" to debitX (will use +/- suffix for direction)
  return {
    creditX: hasCredit ? hasCredit.x : null,
    debitX: hasDebit ? hasDebit.x : (hasAmount ? hasAmount.x : null),
    balanceX: hasBalance ? hasBalance.x : null,
    dateX: hasDate ? hasDate.x : null,
    descriptionX: hasDesc ? hasDesc.x : null,
    headerY: y,
  };
}
```

### columnParser.ts -- handle +/- suffix direction

When `layout.creditX` is null (single Amount column), check the raw text of the amount item for `+` or `-` suffix to determine credit/debit direction. Update `cleanAmount` to also return the sign suffix.

### parser.ts -- clean descriptions

```
function cleanDescription(desc: string): string {
  return desc
    .replace(/[A-Z]{0,3}\$/gi, '')   // Remove J$, US$, etc.
    .replace(/[--]€£¥/g, '')           // Remove currency symbols and dashes
    .replace(/\b\d+\b/g, '')          // Remove standalone numbers
    .replace(/(?<![A-Za-z])-(?![A-Za-z])/g, '') // Remove standalone hyphens
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Change join from em-dash to space:
const description = descParts.join(' ');
```

### textExtractor.ts -- 2px Y-snapping

```
// Change:
const y = Math.round(item.transform[5]);
// To:
const y = Math.round(item.transform[5] / 2) * 2;
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnExtractor.ts` | Detect "Amount" as valid column header |
| `src/lib/pdf/columnParser.ts` | Handle single Amount column with +/- direction |
| `src/lib/pdf/parser.ts` | Clean descriptions properly, join with space |
| `src/lib/pdf/textExtractor.ts` | Use 2px Y-snapping |

## Expected Result

After the fix:
- "THIRD PARTY TRANSFER Transfer from DARREN CHAMBERS" (no trailing numbers)
- "PC-BILL PAYMENT JPS CO" (no trailing numbers)  
- "STAMP DUTY TAX" (no J$ prefix)
- "GCT/GOVT TAX ON SERVICE CHARGE OF" (no numbers)
- "PREPAID VOUCHER DIGICEL" (no phone numbers)
- No blank/empty descriptions
- No "J$" appearing anywhere in descriptions

