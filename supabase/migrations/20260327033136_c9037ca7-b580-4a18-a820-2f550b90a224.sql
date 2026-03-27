
-- Drop existing INSERT and UPDATE policies on subscriptions that allow any authenticated user
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Recreate INSERT and UPDATE policies restricted to service_role only
-- This ensures only backend edge functions (using service_role key) can modify subscriptions
CREATE POLICY "Only service_role can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service_role can update subscriptions"
ON public.subscriptions
FOR UPDATE
TO service_role
USING (true);
