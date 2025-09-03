-- Extend comparisons table with time tracking and quality management fields
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS shown_at_client TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS shown_at_server TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS submitted_at_client TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS submitted_at_server TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS focus_window_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS focus_interaction_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS focus_to_click_ms INTEGER;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS decision_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS is_duplicate_submission BOOLEAN DEFAULT false;

-- Mirror reshow and bias detection fields
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS is_mirror BOOLEAN DEFAULT false;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS mirror_group_id UUID;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS mirror_seq INTEGER;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS mirror_of_pair_id TEXT;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS mirror_type TEXT; -- 'identical' or 'surrogate'
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS mirror_cross_question BOOLEAN DEFAULT false;

-- Duplicate re-evaluation fields
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS is_duplicate_reeval BOOLEAN DEFAULT false;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS reeval_group_id UUID;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS reeval_type TEXT; -- 'mirror' or 'duplicate'
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS min_gap_comparisons INTEGER;

-- UI order tracking
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS ui_order_left_id UUID;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS ui_order_right_id UUID;

-- Weight and quality management
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS weight_applied DECIMAL DEFAULT 1.0;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS popup_shown BOOLEAN DEFAULT false;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS popup_reason TEXT;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS popup_at_server TIMESTAMP WITH TIME ZONE;

-- Agreement tracking
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS agreement_snapshot DECIMAL;

-- Create reviewer_stats table for individual statistics
CREATE TABLE IF NOT EXISTS public.reviewer_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  project_id UUID NOT NULL,
  question_number INTEGER NOT NULL DEFAULT 1,
  total_comparisons INTEGER DEFAULT 0,
  consecutive_left_choices INTEGER DEFAULT 0,
  consecutive_right_choices INTEGER DEFAULT 0,
  max_consecutive_left INTEGER DEFAULT 0,
  max_consecutive_right INTEGER DEFAULT 0,
  short_decision_count INTEGER DEFAULT 0,
  short_decision_streaks INTEGER DEFAULT 0,
  agreement_rate DECIMAL DEFAULT 0.0,
  inconsistency_count INTEGER DEFAULT 0,
  inconsistency_rate DECIMAL DEFAULT 0.0,
  final_weight_applied DECIMAL DEFAULT 1.0,
  low_agreement_flag BOOLEAN DEFAULT false,
  last_popup_at TIMESTAMP WITH TIME ZONE,
  popup_cooldown_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, project_id, question_number)
);

-- Enable RLS on reviewer_stats
ALTER TABLE public.reviewer_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for reviewer_stats
CREATE POLICY "Students can view their own stats" 
ON public.reviewer_stats 
FOR SELECT 
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM students s WHERE s.id = reviewer_stats.student_id
));

CREATE POLICY "Students can update their own stats"
ON public.reviewer_stats
FOR ALL
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM students s WHERE s.id = reviewer_stats.student_id
));

CREATE POLICY "Teachers can view stats for their projects"
ON public.reviewer_stats
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = reviewer_stats.project_id AND p.teacher_id = auth.uid()
));

-- Create session_metadata table
CREATE TABLE IF NOT EXISTS public.session_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE,
  project_id UUID NOT NULL,
  question_number INTEGER NOT NULL DEFAULT 1,
  random_seed TEXT NOT NULL,
  app_version TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  target_per_response INTEGER DEFAULT 15,
  reviewer_target_per_person INTEGER DEFAULT 15,
  pairing_strategy TEXT DEFAULT 'balanced_adaptive',
  k_elo DECIMAL DEFAULT 32.0,
  allow_tie BOOLEAN DEFAULT true,
  short_response_threshold_ms INTEGER DEFAULT 3000,
  consecutive_bias_threshold INTEGER DEFAULT 5,
  mirror_reshow_gap INTEGER DEFAULT 4,
  duplicate_reeval_gap INTEGER DEFAULT 10,
  agreement_update_interval INTEGER DEFAULT 10,
  global_score_refresh_interval INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on session_metadata
ALTER TABLE public.session_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for session_metadata
CREATE POLICY "Students can view session metadata for active projects"
ON public.session_metadata
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = session_metadata.project_id AND p.is_active = true
));

CREATE POLICY "Teachers can manage session metadata for their projects"
ON public.session_metadata
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = session_metadata.project_id AND p.teacher_id = auth.uid()
));

-- Create trigger for reviewer_stats updated_at
CREATE TRIGGER update_reviewer_stats_updated_at
BEFORE UPDATE ON public.reviewer_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for session_metadata updated_at  
CREATE TRIGGER update_session_metadata_updated_at
BEFORE UPDATE ON public.session_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comparisons_decision_id ON public.comparisons(decision_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_mirror_group ON public.comparisons(mirror_group_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_reeval_group ON public.comparisons(reeval_group_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_time_tracking ON public.comparisons(shown_at_server, submitted_at_server);
CREATE INDEX IF NOT EXISTS idx_reviewer_stats_student_project ON public.reviewer_stats(student_id, project_id, question_number);
CREATE INDEX IF NOT EXISTS idx_session_metadata_project_question ON public.session_metadata(project_id, question_number);