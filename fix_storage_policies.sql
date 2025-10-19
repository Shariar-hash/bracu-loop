-- Fix storage bucket policies for both Notes and Questions
-- Run this in Supabase SQL Editor

-- Create storage policies for student-notes bucket
DROP POLICY IF EXISTS "Allow public uploads to student notes" ON storage.objects;
CREATE POLICY "Allow public uploads to student notes" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'student-notes');

DROP POLICY IF EXISTS "Allow public access to student notes" ON storage.objects;
CREATE POLICY "Allow public access to student notes" ON storage.objects
FOR SELECT USING (bucket_id = 'student-notes');

DROP POLICY IF EXISTS "Allow public deletes to student notes" ON storage.objects;
CREATE POLICY "Allow public deletes to student notes" ON storage.objects
FOR DELETE USING (bucket_id = 'student-notes');

-- Also ensure question-papers policies exist
DROP POLICY IF EXISTS "Allow public uploads to question papers" ON storage.objects;
CREATE POLICY "Allow public uploads to question papers" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'question-papers');

DROP POLICY IF EXISTS "Allow public access to question files" ON storage.objects;
CREATE POLICY "Allow public access to question files" ON storage.objects
FOR SELECT USING (bucket_id = 'question-papers');

DROP POLICY IF EXISTS "Allow public deletes to question papers" ON storage.objects;
CREATE POLICY "Allow public deletes to question papers" ON storage.objects
FOR DELETE USING (bucket_id = 'question-papers');

-- Make sure the buckets exist and are public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('student-notes', 'question-papers');

-- Grant necessary permissions for storage
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO anon;

SELECT 'Storage policies updated for both Notes and Questions!' as result;