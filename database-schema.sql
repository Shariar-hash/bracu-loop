-- BRACU Loop Database Schema
-- This file contains the complete database setup for the BRACU Loop application
-- Run these SQL commands in your Supabase SQL editor in order

-- 1. Create the main tables
-- Note: Some tables might already exist if you used Supabase Auth

-- Faculty Reviews Table
CREATE TABLE IF NOT EXISTS public.faculty_reviews (
    id SERIAL PRIMARY KEY,
    faculty_initial TEXT NOT NULL,
    course_code TEXT,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    comment TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Support for reply system
    parent_faculty_initial TEXT,
    parent_created_at TIMESTAMP WITH TIME ZONE,
    parent_course_code TEXT,
    -- Unique constraint for main reviews
    CONSTRAINT reviews_unique_key UNIQUE (faculty_initial, created_at, course_code)
);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id SERIAL PRIMARY KEY,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT,
    credits DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review Votes Table (for upvote/downvote system)
CREATE TABLE IF NOT EXISTS public.review_votes (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    review_faculty_initial TEXT NOT NULL,
    review_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    review_course_code TEXT,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one vote per user per review
    CONSTRAINT unique_user_review_vote UNIQUE (user_email, review_faculty_initial, review_created_at, review_course_code)
);

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_faculty_initial ON public.faculty_reviews(faculty_initial);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_course_code ON public.faculty_reviews(course_code);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_created_at ON public.faculty_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_user_email ON public.faculty_reviews(user_email);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_parent ON public.faculty_reviews(parent_faculty_initial, parent_created_at, parent_course_code);

CREATE INDEX IF NOT EXISTS idx_review_votes_user_email ON public.review_votes(user_email);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON public.review_votes(review_faculty_initial, review_created_at, review_course_code);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.faculty_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Faculty Reviews Policies
CREATE POLICY "Allow read access to all reviews" ON public.faculty_reviews
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert reviews" ON public.faculty_reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own reviews" ON public.faculty_reviews
    FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Allow users to delete their own reviews" ON public.faculty_reviews
    FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- Review Votes Policies
CREATE POLICY "Allow read access to all votes" ON public.review_votes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert votes" ON public.review_votes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Allow users to update their own votes" ON public.review_votes
    FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Allow users to delete their own votes" ON public.review_votes
    FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- Profiles Policies
CREATE POLICY "Allow users to view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses Policies (read-only for most users)
CREATE POLICY "Allow read access to all courses" ON public.courses
    FOR SELECT USING (true);

-- 5. Create functions and triggers

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for faculty_reviews updated_at
DROP TRIGGER IF EXISTS update_faculty_reviews_updated_at ON public.faculty_reviews;
CREATE TRIGGER update_faculty_reviews_updated_at
    BEFORE UPDATE ON public.faculty_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Insert sample data (optional)
-- Insert some sample courses
INSERT INTO public.courses (course_code, course_name, credits) VALUES
    ('CSE110', 'Programming Language I', 3.0),
    ('CSE111', 'Programming Language II', 3.0),
    ('CSE220', 'Data Structures', 3.0),
    ('CSE221', 'Algorithms', 3.0),
    ('CSE230', 'Discrete Mathematics', 3.0),
    ('CSE250', 'Circuits and Electronics', 3.0),
    ('CSE260', 'Digital Logic Design', 3.0),
    ('CSE310', 'Object Oriented Programming', 3.0),
    ('CSE320', 'Data Communication', 3.0),
    ('CSE321', 'Computer Networks', 3.0),
    ('CSE330', 'Numerical Methods', 3.0),
    ('CSE340', 'Microprocessors', 3.0),
    ('CSE350', 'Computer Graphics', 3.0),
    ('CSE370', 'Database Systems', 3.0),
    ('CSE420', 'Computer Security', 3.0),
    ('CSE421', 'Computer Networks Sessional', 1.5),
    ('CSE422', 'Artificial Intelligence', 3.0),
    ('CSE423', 'Computer Security Sessional', 1.5),
    ('CSE470', 'Software Engineering', 3.0),
    ('CSE471', 'System Analysis and Design Sessional', 1.5)
ON CONFLICT (course_code) DO NOTHING;

-- 7. Enable realtime for tables (run in Supabase Dashboard -> API -> Realtime)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_reviews;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.review_votes;

COMMIT;
