-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('statement-uploads', 'statement-uploads', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own statements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'statement-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own files
CREATE POLICY "Users can read their own statements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'statement-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own statements"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'statement-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);