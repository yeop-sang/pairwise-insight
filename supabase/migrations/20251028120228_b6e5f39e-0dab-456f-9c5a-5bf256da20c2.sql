-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class_number INTEGER NOT NULL,
  student_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  num_questions INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_assignments table
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  has_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, student_id)
);

-- Create student_responses table
CREATE TABLE IF NOT EXISTS public.student_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  response_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  elo_score REAL DEFAULT 1500.0,
  num_comparisons INTEGER DEFAULT 0,
  num_wins INTEGER DEFAULT 0,
  num_losses INTEGER DEFAULT 0,
  num_ties INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, student_id, question_number)
);

-- Create session_metadata table
CREATE TABLE IF NOT EXISTS public.session_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  random_seed TEXT NOT NULL,
  app_version TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  target_per_response INTEGER NOT NULL DEFAULT 15,
  reviewer_target_per_person INTEGER NOT NULL DEFAULT 15,
  pairing_strategy TEXT NOT NULL DEFAULT 'balanced_adaptive',
  k_elo REAL NOT NULL DEFAULT 32.0,
  allow_tie BOOLEAN NOT NULL DEFAULT true,
  short_response_threshold_ms INTEGER NOT NULL DEFAULT 3000,
  consecutive_bias_threshold INTEGER NOT NULL DEFAULT 5,
  mirror_reshow_gap INTEGER NOT NULL DEFAULT 4,
  duplicate_reeval_gap INTEGER NOT NULL DEFAULT 10,
  agreement_update_interval INTEGER NOT NULL DEFAULT 10,
  global_score_refresh_interval INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comparisons table
CREATE TABLE IF NOT EXISTS public.comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  response_a_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  response_b_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('A', 'B', 'tie')),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  comparison_time_ms INTEGER NOT NULL,
  shown_at_client TIMESTAMP WITH TIME ZONE NOT NULL,
  shown_at_server TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at_client TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at_server TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ui_order_left_id UUID NOT NULL,
  ui_order_right_id UUID NOT NULL,
  is_mirror BOOLEAN NOT NULL DEFAULT false,
  is_duplicate_reeval BOOLEAN NOT NULL DEFAULT false,
  question_number INTEGER NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviewer_stats table
CREATE TABLE IF NOT EXISTS public.reviewer_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  total_comparisons INTEGER NOT NULL DEFAULT 0,
  short_response_count INTEGER NOT NULL DEFAULT 0,
  consecutive_bias_count INTEGER NOT NULL DEFAULT 0,
  last_decision TEXT,
  recent_decision_history TEXT[] DEFAULT '{}',
  agreement_score REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, project_id, question_number)
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_stats ENABLE ROW LEVEL SECURITY;

-- Students RLS policies
CREATE POLICY "Teachers can view their own students"
ON public.students FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own students"
ON public.students FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own students"
ON public.students FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own students"
ON public.students FOR DELETE
USING (auth.uid() = teacher_id);

-- Projects RLS policies
CREATE POLICY "Teachers can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = teacher_id);

-- Project assignments RLS policies
CREATE POLICY "Teachers can view assignments for their projects"
ON public.project_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_assignments.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Teachers can insert assignments for their projects"
ON public.project_assignments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_assignments.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Teachers can update assignments for their projects"
ON public.project_assignments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_assignments.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Students can view their own assignments"
ON public.project_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = project_assignments.student_id
));

CREATE POLICY "Students can update their own assignments"
ON public.project_assignments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = project_assignments.student_id
));

-- Student responses RLS policies
CREATE POLICY "Teachers can view responses for their projects"
ON public.student_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = student_responses.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Students can insert their own responses"
ON public.student_responses FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = student_responses.student_id
));

CREATE POLICY "Students can view responses for active projects"
ON public.student_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = student_responses.project_id
  AND p.is_active = true
));

CREATE POLICY "Students can update their own responses"
ON public.student_responses FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = student_responses.student_id
));

-- Session metadata RLS policies (updated from previous migration)
CREATE POLICY "Teachers can view session metadata for their projects"
ON public.session_metadata FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = session_metadata.project_id
  AND p.teacher_id = auth.uid()
));

-- Comparisons RLS policies  
CREATE POLICY "Teachers can view comparisons for their projects"
ON public.comparisons FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = comparisons.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Students can view comparisons for active projects"
ON public.comparisons FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = comparisons.project_id
  AND p.is_active = true
));

-- Reviewer stats RLS policies
CREATE POLICY "Teachers can view reviewer stats for their projects"
ON public.reviewer_stats FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = reviewer_stats.project_id
  AND p.teacher_id = auth.uid()
));

CREATE POLICY "Students can view their own stats"
ON public.reviewer_stats FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = reviewer_stats.student_id
));

CREATE POLICY "Students can update their own stats"
ON public.reviewer_stats FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = reviewer_stats.student_id
));

-- Create indexes for better performance
CREATE INDEX idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX idx_projects_teacher_id ON public.projects(teacher_id);
CREATE INDEX idx_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX idx_project_assignments_student_id ON public.project_assignments(student_id);
CREATE INDEX idx_student_responses_project_id ON public.student_responses(project_id);
CREATE INDEX idx_student_responses_student_id ON public.student_responses(student_id);
CREATE INDEX idx_comparisons_project_id ON public.comparisons(project_id);
CREATE INDEX idx_comparisons_student_id ON public.comparisons(student_id);
CREATE INDEX idx_reviewer_stats_student_id ON public.reviewer_stats(student_id);
CREATE INDEX idx_reviewer_stats_project_id ON public.reviewer_stats(project_id);

-- Trigger for automatic timestamp updates on students
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic timestamp updates on projects  
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic timestamp updates on student_responses
CREATE TRIGGER update_student_responses_updated_at
  BEFORE UPDATE ON public.student_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic timestamp updates on reviewer_stats
CREATE TRIGGER update_reviewer_stats_updated_at
  BEFORE UPDATE ON public.reviewer_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();