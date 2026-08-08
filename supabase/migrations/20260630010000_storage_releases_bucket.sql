-- Bucket público para APK e releases (requer plano Pro: limite global > 50 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'releases',
  'releases',
  true,
  209715200,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública (download direto pelo site)
DROP POLICY IF EXISTS "releases public read" ON storage.objects;
CREATE POLICY "releases public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'releases');
