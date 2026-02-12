
# Fix: Clean Descriptions and Merchant Names

## Problem
From the screenshot, transactions show descriptions like:
- **"J$ — STAMP"** instead of **"STAMP DUTY TAX"**
- **"J$ — 8763729167"** instead of **"DIGICEL"**
- **"J$"** alone with no useful description
- **"J$ — TRF"** instead of **"TRF TO OSJ ALTERNATIVE..."**

Two root causes:
1. The `cleanMergedDescription` function in `columnParser.ts` does not strip currency symbols (like `J$`) or em-dash separators (`—`)
2. The `merchant_normalized` field in `useUploads.ts` naively takes the first 3 words of the raw description without any cleaning, so "J$" and symbols leak through

## Changes

### 1. Improve `cleanMergedDescription` in `src/lib/pdf/columnParser.ts`

Add additional regex steps to the cleaning function:
- Strip currency symbol patterns (`J$`, `A$`, `US$`, `$`, etc.)
- Strip em-dash characters (`—`, `–`, `--`)
- Remove standalone punctuation and symbols
- The existing logic to remove standalone numbers and collapse spaces stays

### 2. Improve `merchant_normalized` generation in `src/hooks/useUploads.ts`

Instead of naively splitting the description into first 3 words, apply proper cleaning:
- Strip currency symbols, numbers, and symbols from the description first
- Use the cleaned full description (truncated to 50 chars) as the merchant name
- This ensures entries like "STAMP DUTY TAX", "WITHHOLDING TAX", "DIGICEL" display correctly

### 3. Update `extractVendorName` in `src/lib/vendorExtractor.ts`

Add currency symbol stripping at the start so the vendor extractor also handles "J$" prefixed strings correctly.

## Technical Details

### columnParser.ts - `cleanMergedDescription`
```
function cleanMergedDescription(desc: string): string {
  return desc
    // Remove currency symbols like J$, A$, US$, $, etc.
    .replace(/[A-Z]{0,3}\$/gi, '')
    .replace(/[€£¥]/g, '')
    // Remove em-dash / en-dash separators
    .replace(/[—–]/g, '')
    // Remove standalone numbers
    .replace(/\b\d+\b/g, '')
    // Remove standalone symbols (not hyphens inside words)
    .replace(/(?<![A-Za-z])-(?![A-Za-z])/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

### useUploads.ts - merchant_normalized generation
```
// Clean merchant name: strip currency, numbers, symbols
const cleanForMerchant = (desc: string) =>
  desc
    .replace(/[A-Z]{0,3}\$/gi, '')
    .replace(/[€£¥]/g, '')
    .replace(/[—–]/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/(?<![A-Za-z])-(?![A-Za-z])/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 50);

merchant_normalized: cleanForMerchant(t.description),
```

### vendorExtractor.ts
Add currency stripping as the first step:
```
vendor = vendor.replace(/[A-Z]{0,3}\$/g, '').trim();
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf/columnParser.ts` | Add currency and em-dash stripping to `cleanMergedDescription` |
| `src/hooks/useUploads.ts` | Replace naive 3-word split with proper cleaning for `merchant_normalized` |
| `src/lib/vendorExtractor.ts` | Add currency symbol stripping |

## Important Note
Existing transactions already stored in the database will still show the old descriptions. The user will need to re-upload the PDF to see the corrected descriptions, or we could add a note about that.
