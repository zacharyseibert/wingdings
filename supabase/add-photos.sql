-- Add photo_url to wing_entries
ALTER TABLE wing_entries ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for wing photos (run in Supabase Dashboard → Storage if this doesn't work via SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wing-photos',
  'wing-photos',
  true,
  524288,  -- 512KB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload wing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wing-photos');

-- Allow public to read photos
CREATE POLICY "Public can view wing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wing-photos');
