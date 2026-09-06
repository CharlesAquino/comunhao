INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'ebd-media',
  'ebd-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "ebd_media_public_read" ON storage.objects;
CREATE POLICY "ebd_media_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ebd-media');

DROP POLICY IF EXISTS "ebd_media_authenticated_insert_own_folder" ON storage.objects;
CREATE POLICY "ebd_media_authenticated_insert_own_folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ebd-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "ebd_media_authenticated_update_own_folder" ON storage.objects;
CREATE POLICY "ebd_media_authenticated_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ebd-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'ebd-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "ebd_media_authenticated_delete_own_folder" ON storage.objects;
CREATE POLICY "ebd_media_authenticated_delete_own_folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ebd-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
