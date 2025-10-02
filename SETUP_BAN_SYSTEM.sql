-- ==================================================
-- BAN SYSTEM DATABASE SETUP
-- ==================================================
-- Run this in your Supabase SQL Editor

-- Create the banned users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_name TEXT,
    reason TEXT NOT NULL,
    banned_by TEXT NOT NULL,
    ban_duration TEXT, -- e.g., "30 days", "60 days", null for permanent
    is_permanent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for admin functionality (adjust based on your security needs)
ALTER TABLE public.admin_banned_users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE public.admin_banned_users TO authenticated, anon, postgres;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_banned_users_email ON public.admin_banned_users(user_email);
CREATE INDEX IF NOT EXISTS idx_banned_users_active ON public.admin_banned_users(is_active);

-- Test insert (optional - remove if you don't want test data)
INSERT INTO public.admin_banned_users (user_email, user_name, reason, banned_by, ban_duration, is_permanent, is_active, expires_at)
VALUES ('test@example.com', 'Test User', 'Testing ban system', 'admin', '30 days', false, true, NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

SELECT 'Ban system setup completed successfully!' as status;