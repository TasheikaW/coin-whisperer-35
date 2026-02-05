

# Fix Income Calculation: Use Transaction Direction

## Current Problem

Total Income is calculated by filtering only transactions with category name "Salary":
```typescript
totalIncome: transactions
  .filter(t => t.categories?.name === 'Salary')
  .reduce((sum, t) => sum + t.amount, 0),
```

This misses other income sources and doesn't align with how the data is stored.

## Solution

Calculate income based on `direction === 'credit'` instead of category name, excluding transfers.

## Implementation

### File: `src/hooks/useDashboardData.ts`

**Change the totalIncome calculation:**

```typescript
// Before
totalIncome: transactions
  .filter(t => t.categories?.name === 'Salary')
  .reduce((sum, t) => sum + t.amount, 0),

// After
totalIncome: transactions
  .filter(t => t.direction === 'credit' && !t.is_transfer)
  .reduce((sum, t) => sum + t.amount, 0),
```

**Also update monthly trends income calculation:**

```typescript
// Before
income: monthTransactions
  .filter(t => t.categories?.name === 'Salary')
  .reduce((sum, t) => sum + t.amount, 0),

// After
income: monthTransactions
  .filter(t => t.direction === 'credit' && !t.is_transfer)
  .reduce((sum, t) => sum + t.amount, 0),
```

## Summary

| Location | Change |
|----------|--------|
| `stats.totalIncome` | Filter by `direction === 'credit'` instead of category |
| `monthlyTrends.income` | Same filter for monthly chart data |

## Result

- All credit transactions (refunds, deposits, salary, freelance income) count as income
- Transfers are excluded to avoid double-counting
- Savings rate calculation will be more accurate

