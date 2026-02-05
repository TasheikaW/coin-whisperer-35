
# Add Credit Card Payment Detection to Transfer Flag

## Problem

Credit card payments (e.g., "ONLINE PAYMENT", "PMT RECEIVED") are credit transactions that currently pass through as income because they don't match the transfer detection pattern.

## Solution

Expand the transfer detection regex to include common credit card payment patterns.

## Implementation

### File: `src/hooks/useUploads.ts`

**Line 245 - Update the `is_transfer` regex:**

```typescript
// Before
is_transfer: /transfer|xfer|tfr|move|payment to|payment from|zelle|venmo|paypal/i.test(t.description),

// After
is_transfer: /transfer|xfer|tfr|move|payment to|payment from|zelle|venmo|paypal|online payment|pmt|payment received|payment - thank/i.test(t.description),
```

**New patterns added:**
| Pattern | Matches |
|---------|---------|
| `online payment` | "ONLINE PAYMENT RECEIVED" |
| `pmt` | "PMT THANK YOU", "PMT RECEIVED" |
| `payment received` | "PAYMENT RECEIVED" |
| `payment - thank` | "PAYMENT - THANK YOU" |

## Result

- Credit card payments will be flagged as `is_transfer = true`
- They will be excluded from income calculations
- Only actual income (salary, refunds, deposits) will count toward Total Income

## Note

This fix applies to **new uploads only**. Existing transactions in the database will retain their current `is_transfer` value. If you want to fix existing data, I can also provide a database update query.
