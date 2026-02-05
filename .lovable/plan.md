
# Extract Vendor Name Only for Category Rules

## Problem

Your transactions have merchant names like:
- `HOPP/O/2511182241 Toronto`
- `HOPP/O/2511182131 Toronto`
- `HOPP/O/2511181428 Toronto`

Currently, when you categorize one, it uses the full merchant string as the pattern. This means only that exact transaction matches, not all HOPP transactions.

## Solution

Add a vendor extraction function that strips out codes, numbers, and location suffixes to get just the core vendor name.

## Implementation

### 1. Create Vendor Extraction Utility

**File**: `src/lib/vendorExtractor.ts` (new file)

```typescript
export function extractVendorName(merchantString: string): string {
  if (!merchantString) return '';
  
  // Common patterns to extract vendor:
  // "HOPP/O/2511182241 Toronto" → "HOPP"
  // "AMAZON.CA*AB1CD2EF3" → "AMAZON"
  // "UBER* TRIP 12345" → "UBER"
  
  let vendor = merchantString.trim();
  
  // Split on common separators and take first part
  vendor = vendor.split(/[\/\*#@]/)[0].trim();
  
  // Remove trailing numbers and codes
  vendor = vendor.replace(/[\d]+$/, '').trim();
  
  // Remove common suffixes like location names (if followed by nothing else)
  vendor = vendor.split(/\s+/)[0];
  
  return vendor.toUpperCase();
}
```

### 2. Update SaveRuleDialog to Show Extracted Vendor

**File**: `src/components/transactions/SaveRuleDialog.tsx`

- Import the extractor
- Extract vendor name from `merchantName` prop
- Display the extracted vendor in the dialog
- Use extracted vendor for matching and saving rules

Dialog will now show:
```
Apply "Transportation" to all transactions from "HOPP"?
This will update 4 existing transactions...
```

### 3. Update useCategoryRules Hook

**File**: `src/hooks/useCategoryRules.ts`

- Use the extracted vendor name for pattern matching
- Match transactions where `merchant_normalized` starts with the vendor pattern

### 4. Update Transactions Page

**File**: `src/pages/Transactions.tsx`

- Pass the full merchant name to the dialog (extraction happens inside)

## Technical Details

**Vendor extraction logic:**
```typescript
"HOPP/O/2511182241 Toronto" 
  → split on "/" → ["HOPP", "O", "2511182241 Toronto"]
  → take first → "HOPP"

"AMAZON.CA*AB1CD2EF3"
  → split on "*" → ["AMAZON.CA", "AB1CD2EF3"]  
  → take first → "AMAZON.CA"
  → optionally clean to "AMAZON"
```

**Matching query:**
```typescript
// Match all transactions starting with vendor
.ilike('merchant_normalized', `${vendorName}%`)
```

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/vendorExtractor.ts` |
| Modify | `src/components/transactions/SaveRuleDialog.tsx` |
| Modify | `src/hooks/useCategoryRules.ts` |

## Result

After this change:
- Categorize any HOPP transaction → Dialog shows "Apply to all HOPP transactions?"
- Click "Yes, apply all" → All 4 HOPP transactions updated regardless of their codes
- Future uploads with HOPP (any code) → Auto-categorized as Transportation
