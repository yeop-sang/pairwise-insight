-- 1. Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create response_embeddings table for storing embedding vectors
CREATE TABLE IF NOT EXISTS public.response_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  response_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  embedding REAL[] NOT NULL,
  model_id TEXT NOT NULL,
  dimension INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, model_id),
  CHECK (array_length(embedding, 1) = dimension)
);

-- Indexes for response_embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_project_question 
  ON public.response_embeddings(project_id, question_number);
CREATE INDEX IF NOT EXISTS idx_embeddings_response 
  ON public.response_embeddings(response_id);

-- Enable RLS on response_embeddings
ALTER TABLE public.response_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for response_embeddings
CREATE POLICY "Teachers can manage embeddings for their projects"
  ON public.response_embeddings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = response_embeddings.project_id
      AND p.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = response_embeddings.project_id
      AND p.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can read embeddings for active projects"
  ON public.response_embeddings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = response_embeddings.project_id
      AND p.is_active = true
  ));

CREATE POLICY "Admins full access on embeddings"
  ON public.response_embeddings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Create bt_runs table for Bradley-Terry model execution metadata
CREATE TABLE IF NOT EXISTS public.bt_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_numbers INTEGER[],
  status TEXT NOT NULL,
  hyperparams JSONB,
  metrics JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT,
  trainer_user_id UUID REFERENCES auth.users(id)
);

-- Indexes for bt_runs
CREATE INDEX IF NOT EXISTS idx_bt_runs_project 
  ON public.bt_runs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_bt_runs_status_running 
  ON public.bt_runs(status) WHERE status IN ('pending', 'running');

-- Enable RLS on bt_runs
ALTER TABLE public.bt_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for bt_runs
CREATE POLICY "Teachers can manage bt_runs for their projects"
  ON public.bt_runs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_runs.project_id
      AND p.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_runs.project_id
      AND p.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can read bt_runs for active projects"
  ON public.bt_runs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_runs.project_id
      AND p.is_active = true
  ));

CREATE POLICY "Admins full access on bt_runs"
  ON public.bt_runs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Create bt_scores table for per-question Bradley-Terry scores
CREATE TABLE IF NOT EXISTS public.bt_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  response_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  se REAL,
  ci_low REAL,
  ci_high REAL,
  rank INTEGER,
  run_id UUID NOT NULL REFERENCES public.bt_runs(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, run_id)
);

-- Indexes for bt_scores
CREATE INDEX IF NOT EXISTS idx_bt_scores_project_question 
  ON public.bt_scores(project_id, question_number);
CREATE INDEX IF NOT EXISTS idx_bt_scores_response 
  ON public.bt_scores(response_id);
CREATE INDEX IF NOT EXISTS idx_bt_scores_run 
  ON public.bt_scores(run_id);

-- Enable RLS on bt_scores
ALTER TABLE public.bt_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for bt_scores
CREATE POLICY "Teachers can manage bt_scores for their projects"
  ON public.bt_scores
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_scores.project_id
      AND p.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_scores.project_id
      AND p.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can read bt_scores for active projects"
  ON public.bt_scores
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bt_scores.project_id
      AND p.is_active = true
  ));

CREATE POLICY "Admins full access on bt_scores"
  ON public.bt_scores
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Create aggregated_scores table for multi-question aggregated scores
CREATE TABLE IF NOT EXISTS public.aggregated_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  method TEXT NOT NULL,
  weights JSONB,
  run_id UUID REFERENCES public.bt_runs(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, run_id, method)
);

-- Indexes for aggregated_scores
CREATE INDEX IF NOT EXISTS idx_agg_scores_project 
  ON public.aggregated_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_agg_scores_response 
  ON public.aggregated_scores(response_id);

-- Enable RLS on aggregated_scores
ALTER TABLE public.aggregated_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for aggregated_scores
CREATE POLICY "Teachers can manage aggregated_scores for their projects"
  ON public.aggregated_scores
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = aggregated_scores.project_id
      AND p.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = aggregated_scores.project_id
      AND p.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can read aggregated_scores for active projects"
  ON public.aggregated_scores
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = aggregated_scores.project_id
      AND p.is_active = true
  ));

CREATE POLICY "Admins full access on aggregated_scores"
  ON public.aggregated_scores
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));