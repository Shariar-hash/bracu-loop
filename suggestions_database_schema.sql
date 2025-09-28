-- Suggestions Feature Database Schema
-- Add these tables to your existing BRACU Loop database
-- Run these SQL commands in your Supabase SQL editor

-- 1. Create Suggestions Posts Table
CREATE TABLE IF NOT EXISTS public.suggestion_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_student_id TEXT,
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Suggestions Comments Table (with nested threading support)
CREATE TABLE IF NOT EXISTS public.suggestion_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.suggestion_posts(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES public.suggestion_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_student_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Suggestions Likes Table (for posts)
CREATE TABLE IF NOT EXISTS public.suggestion_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.suggestion_posts(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one like per user per post
    CONSTRAINT unique_user_post_like UNIQUE (user_email, post_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suggestion_posts_created_at ON public.suggestion_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_posts_author_email ON public.suggestion_posts(author_email);
CREATE INDEX IF NOT EXISTS idx_suggestion_posts_student_id ON public.suggestion_posts(author_student_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_comments_post_id ON public.suggestion_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_parent_id ON public.suggestion_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_author_email ON public.suggestion_comments(author_email);
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_created_at ON public.suggestion_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_suggestion_likes_post_id ON public.suggestion_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_likes_user_email ON public.suggestion_likes(user_email);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.suggestion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_likes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Suggestion Posts Policies
CREATE POLICY "Allow read access to all suggestion posts" ON public.suggestion_posts
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert suggestion posts" ON public.suggestion_posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = author_email);

CREATE POLICY "Allow users to update their own suggestion posts" ON public.suggestion_posts
    FOR UPDATE USING (auth.jwt() ->> 'email' = author_email);

CREATE POLICY "Allow users to delete their own suggestion posts" ON public.suggestion_posts
    FOR DELETE USING (auth.jwt() ->> 'email' = author_email);

-- Suggestion Comments Policies
CREATE POLICY "Allow read access to all suggestion comments" ON public.suggestion_comments
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert suggestion comments" ON public.suggestion_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = author_email);

CREATE POLICY "Allow users to update their own suggestion comments" ON public.suggestion_comments
    FOR UPDATE USING (auth.jwt() ->> 'email' = author_email);

CREATE POLICY "Allow users to delete their own suggestion comments" ON public.suggestion_comments
    FOR DELETE USING (auth.jwt() ->> 'email' = author_email);

-- Suggestion Likes Policies
CREATE POLICY "Allow read access to all suggestion likes" ON public.suggestion_likes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert suggestion likes" ON public.suggestion_likes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Allow users to delete their own suggestion likes" ON public.suggestion_likes
    FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 7. Create functions and triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update post comment count
CREATE OR REPLACE FUNCTION public.update_suggestion_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.suggestion_posts 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.suggestion_posts 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for comment count
DROP TRIGGER IF EXISTS suggestion_comment_count_insert ON public.suggestion_comments;
CREATE TRIGGER suggestion_comment_count_insert
    AFTER INSERT ON public.suggestion_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_post_comment_count();

DROP TRIGGER IF EXISTS suggestion_comment_count_delete ON public.suggestion_comments;
CREATE TRIGGER suggestion_comment_count_delete
    AFTER DELETE ON public.suggestion_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_post_comment_count();

-- Function to update post like count
CREATE OR REPLACE FUNCTION public.update_suggestion_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.suggestion_posts 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.suggestion_posts 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for like count
DROP TRIGGER IF EXISTS suggestion_like_count_insert ON public.suggestion_likes;
CREATE TRIGGER suggestion_like_count_insert
    AFTER INSERT ON public.suggestion_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_post_like_count();

DROP TRIGGER IF EXISTS suggestion_like_count_delete ON public.suggestion_likes;
CREATE TRIGGER suggestion_like_count_delete
    AFTER DELETE ON public.suggestion_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_post_like_count();

-- Trigger for updated_at timestamps
DROP TRIGGER IF EXISTS update_suggestion_posts_updated_at ON public.suggestion_posts;
CREATE TRIGGER update_suggestion_posts_updated_at
    BEFORE UPDATE ON public.suggestion_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_suggestion_comments_updated_at ON public.suggestion_comments;
CREATE TRIGGER update_suggestion_comments_updated_at
    BEFORE UPDATE ON public.suggestion_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable realtime for suggestions tables
-- Run these in Supabase Dashboard -> API -> Realtime or via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_posts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_comments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_likes;

COMMIT;