-- Drop existing explain_features table and rename/restructure
DROP TABLE IF EXISTS public.explain_features CASCADE;

-- Create feature_summary table (Top-k 요약 저장)
CREATE TABLE public.feature_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.bt_runs(id) ON DELETE CASCADE,
  good_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  bad_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature_words table (단어 중요도 저장)
CREATE TABLE public.feature_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.bt_runs(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  score REAL NOT NULL,
  polarity TEXT NOT NULL CHECK (polarity IN ('positive', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_feature_summary_project_id ON public.feature_summary(project_id);
CREATE INDEX idx_feature_summary_run_id ON public.feature_summary(run_id);

CREATE INDEX idx_feature_words_project_id ON public.feature_words(project_id);
CREATE INDEX idx_feature_words_run_id ON public.feature_words(run_id);
CREATE INDEX idx_feature_words_polarity ON public.feature_words(polarity);
CREATE INDEX idx_feature_words_score_desc ON public.feature_words(score DESC);

-- Enable RLS
ALTER TABLE public.feature_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_words ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_summary
CREATE POLICY "Admins full access on feature_summary"
  ON public.feature_summary
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage feature_summary for their projects"
  ON public.feature_summary
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_summary.project_id
      AND p.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_summary.project_id
      AND p.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read feature_summary for active projects"
  ON public.feature_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_summary.project_id
      AND p.is_active = true
    )
  );

-- RLS policies for feature_words
CREATE POLICY "Admins full access on feature_words"
  ON public.feature_words
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage feature_words for their projects"
  ON public.feature_words
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_words.project_id
      AND p.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_words.project_id
      AND p.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read feature_words for active projects"
  ON public.feature_words
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = feature_words.project_id
      AND p.is_active = true
    )
  );