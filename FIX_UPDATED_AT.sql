-- Fix the updated_at timestamp issue
-- This ensures updated_at is only set when actually updating, not on insert

-- Drop the existing triggers
DROP TRIGGER IF EXISTS update_suggestion_posts_updated_at ON public.suggestion_posts;
DROP TRIGGER IF EXISTS update_suggestion_comments_updated_at ON public.suggestion_comments;

-- Create a better update function that only triggers on actual updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update the updated_at if this is actually an UPDATE operation
    -- and if some other column changed
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers - these will only fire on UPDATE, not INSERT
CREATE TRIGGER update_suggestion_posts_updated_at
    BEFORE UPDATE ON public.suggestion_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suggestion_comments_updated_at
    BEFORE UPDATE ON public.suggestion_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing posts to set updated_at = NULL if it equals created_at
UPDATE public.suggestion_posts 
SET updated_at = NULL 
WHERE updated_at = created_at;