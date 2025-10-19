-- Complete Notes System Database Setup
-- Run this in Supabase SQL Editor

-- Create student_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  course_code text NOT NULL,
  course_name text,
  category text NOT NULL,
  
  -- File information
  file_name text,
  file_size bigint,
  file_type text,
  file_path text,
  
  -- Link information  
  upload_type text NOT NULL CHECK (upload_type IN ('file', 'link')),
  link_url text,
  link_type text,
  
  -- Uploader information
  uploader_name text NOT NULL,
  uploader_email text NOT NULL,
  uploader_student_id text,
  
  -- Metadata
  is_approved boolean DEFAULT true,
  download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_notes_course_code ON public.student_notes(course_code);
CREATE INDEX IF NOT EXISTS idx_student_notes_category ON public.student_notes(category);
CREATE INDEX IF NOT EXISTS idx_student_notes_uploader_email ON public.student_notes(uploader_email);
CREATE INDEX IF NOT EXISTS idx_student_notes_created_at ON public.student_notes(created_at);

-- Disable RLS temporarily for testing
ALTER TABLE public.student_notes DISABLE ROW LEVEL SECURITY;

-- Grant public access for testing (REMOVE IN PRODUCTION)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO anon;

-- Create or update storage policies for student-notes bucket
DROP POLICY IF EXISTS "Allow public uploads to student notes" ON storage.objects;
CREATE POLICY "Allow public uploads to student notes" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'student-notes');

DROP POLICY IF EXISTS "Allow public access to student notes" ON storage.objects;
CREATE POLICY "Allow public access to student notes" ON storage.objects
FOR SELECT USING (bucket_id = 'student-notes');

DROP POLICY IF EXISTS "Allow public deletes to student notes" ON storage.objects;
CREATE POLICY "Allow public deletes to student notes" ON storage.objects
FOR DELETE USING (bucket_id = 'student-notes');

-- Make sure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'student-notes';

-- Grant storage permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;

SELECT 'Notes system database setup complete!' as result;
