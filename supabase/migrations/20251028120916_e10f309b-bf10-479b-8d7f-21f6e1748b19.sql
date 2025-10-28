-- Add missing columns to comparisons table
ALTER TABLE public.comparisons
ADD COLUMN IF NOT EXISTS weight_applied REAL,
ADD COLUMN IF NOT EXISTS mirror_group_id TEXT,
ADD COLUMN IF NOT EXISTS reeval_group_id TEXT,
ADD COLUMN IF NOT EXISTS agreement_snapshot REAL,
ADD COLUMN IF NOT EXISTS popup_shown BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS popup_reason TEXT;

-- Add missing columns to reviewer_stats table
ALTER TABLE public.reviewer_stats
ADD COLUMN IF NOT EXISTS consecutive_left_choices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_right_choices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_consecutive_left INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_consecutive_right INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS short_decision_streaks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_agreement_flag BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inconsistency_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inconsistency_rate REAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS final_weight_applied REAL DEFAULT 1.0;