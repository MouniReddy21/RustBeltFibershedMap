-- Create public storage bucket for exchange post photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exchange-photos',
  'exchange-photos',
  true,
  5242880, -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the exchange-photos bucket
CREATE POLICY "Authenticated users can upload exchange photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exchange-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete their exchange photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'exchange-photos');

-- Allow public read of all exchange photos
CREATE POLICY "Exchange photos are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'exchange-photos');
