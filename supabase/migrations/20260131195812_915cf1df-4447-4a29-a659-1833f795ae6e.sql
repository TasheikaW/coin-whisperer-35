-- Drop the existing foreign key constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_upload_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_upload_id_fkey 
FOREIGN KEY (upload_id) 
REFERENCES public.uploads(id) 
ON DELETE CASCADE;