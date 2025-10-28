-- Add remaining missing columns to reviewer_stats table
ALTER TABLE public.reviewer_stats
ADD COLUMN IF NOT EXISTS last_popup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS popup_cooldown_remaining INTEGER DEFAULT 0;