
CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
ON public.subscriptions
FOR DELETE
TO public
USING (auth.uid() = user_id);
