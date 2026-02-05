
# Add Column Sorting to Transactions Table

## Overview

Add clickable sort buttons to all column headers (Date, Description, Category, Source, Amount) with ascending/descending toggle functionality.

## Implementation

### File: `src/pages/Transactions.tsx`

**1. Add sorting state (after line 72):**
```typescript
type SortField = 'date' | 'description' | 'category' | 'source' | 'amount';
type SortDirection = 'asc' | 'desc';

const [sortField, setSortField] = useState<SortField>('date');
const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
```

**2. Add sort toggle function:**
```typescript
const handleSort = (field: SortField) => {
  if (sortField === field) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortDirection('desc');
  }
};
```

**3. Update `filteredTransactions` to include sorting:**
- After filtering, sort by the selected field
- Handle each field type appropriately:
  - **Date**: Sort by `transaction_date` string (YYYY-MM-DD format)
  - **Description**: Sort by `merchant_normalized` or `description_raw`
  - **Category**: Sort by `categories?.name`
  - **Source**: Sort by `uploads?.filename`
  - **Amount**: Sort numerically, considering direction (credit/debit)

**4. Create sortable header component:**
- Replace static `<th>` elements with clickable buttons
- Show sort direction indicator (arrow up/down) on active column
- Use `ArrowUp` and `ArrowDown` icons from lucide-react

**5. Update table headers (lines 244-254):**
Each header becomes a clickable button showing:
- Column name
- Sort indicator when active (up arrow for asc, down arrow for desc)
- Muted indicator when not active

## UI Behavior

| Action | Result |
|--------|--------|
| Click unsorted column | Sort descending by that column |
| Click already sorted column | Toggle between asc/desc |
| Visual indicator | Active column shows directional arrow |

## Technical Details

- Sorting happens client-side on already-fetched data
- Default sort: Date descending (newest first)
- Stable sort preserves order for equal values
