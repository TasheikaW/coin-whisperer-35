

## Fix: Add Missing RLS Policies on `subscriptions` Table

The `subscriptions` table currently only has SELECT and INSERT RLS policies. Any authenticated user can UPDATE or DELETE any subscription record, which is a critical security vulnerability.

### What will change

A database migration adding two RLS policies:

1. **UPDATE policy** — users can only update their own subscription (`auth.uid() = user_id`)
2. **DELETE policy** — users can only delete their own subscription (`auth.uid() = user_id`)

No code changes needed — this is a single SQL migration.

