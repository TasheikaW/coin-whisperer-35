

# Add Category Rule Learning: Remember & Apply to Existing

## Overview

When you manually change a transaction's category, the system will:
1. **Prompt** you to save this as a rule for the merchant
2. **Apply** the category to all existing matching transactions
3. **Remember** this for future uploads

## User Experience

After changing a category, a dialog appears:

```
+-----------------------------------------+
|  Remember this category?                |
|                                         |
|  Apply "Transportation" to all          |
|  transactions from "HOPP"?              |
|                                         |
|  This will update 3 existing            |
|  transactions and remember for          |
|  future uploads.                        |
|                                         |
|  [No, just this one]  [Yes, apply all]  |
+-----------------------------------------+
```

## Implementation

### 1. Create Save Rule Dialog Component

**New file**: `src/components/transactions/SaveRuleDialog.tsx`

A dialog component that:
- Shows the merchant name and selected category
- Displays count of existing transactions that will be updated
- Offers "Just this one" or "Apply to all" options

### 2. Add Hook for Category Rules

**New file**: `src/hooks/useCategoryRules.ts`

Functions to:
- Save a new category rule to the database
- Apply category to all matching transactions
- Check for existing transactions that match the merchant

### 3. Update Transactions Page

**File**: `src/pages/Transactions.tsx`

Changes:
- After category change, show the SaveRuleDialog
- Pass merchant name and category info to dialog
- Handle dialog response (save rule + update matching transactions)

### 4. Update Transactions Hook

**File**: `src/hooks/useTransactions.ts`

Add new function:
- `updateMatchingTransactions(merchantPattern, categoryId)` - bulk update all transactions matching the pattern

## Technical Details

### Database Operations

When user clicks "Yes, apply all":

```typescript
// 1. Save the rule
await supabase.from('category_rules').insert({
  user_id: user.id,
  category_id: categoryId,
  pattern: merchantNormalized.toLowerCase(),
  pattern_type: 'merchant',
  priority: 10  // User rules take priority
});

// 2. Update all matching transactions
await supabase
  .from('transactions')
  .update({ category_id: categoryId })
  .eq('user_id', user.id)
  .ilike('merchant_normalized', `%${merchantNormalized}%`);
```

### Merchant Extraction

Uses `merchant_normalized` from the transaction, or falls back to first 3 words of `description_raw`.

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/transactions/SaveRuleDialog.tsx` |
| Create | `src/hooks/useCategoryRules.ts` |
| Modify | `src/pages/Transactions.tsx` |
| Modify | `src/hooks/useTransactions.ts` |

## Result

After implementation:
- Change "HOPP" to Transportation → Dialog asks to remember
- Click "Yes, apply all" → Rule saved + all HOPP transactions updated
- Upload new file next month → HOPP auto-categorized as Transportation

