-- Create explain_features table for storing explainability results
CREATE TABLE public.explain_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  run_id UUID REFERENCES public.autoscore_runs(id) ON DELETE SET NULL,
  good_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  bad_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_k INTEGER NOT NULL DEFAULT 30,
  model_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vocab_embeddings table for caching word embeddings
CREATE TABLE public.vocab_embeddings (
  word TEXT NOT NULL,
  model_id TEXT NOT NULL,
  embedding REAL[] NOT NULL,
  dimension INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (word, model_id)
);

-- Add indexes for performance
CREATE INDEX idx_explain_features_project_question ON public.explain_features(project_id, question_number);
CREATE INDEX idx_explain_features_run_id ON public.explain_features(run_id);
CREATE INDEX idx_vocab_embeddings_model_id ON public.vocab_embeddings(model_id);

-- Enable RLS
ALTER TABLE public.explain_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for explain_features
CREATE POLICY "Admins full access on explain_features"
  ON public.explain_features
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage explain_features for their projects"
  ON public.explain_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = explain_features.project_id
      AND p.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = explain_features.project_id
      AND p.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read explain_features for active projects"
  ON public.explain_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = explain_features.project_id
      AND p.is_active = true
    )
  );

-- RLS policies for vocab_embeddings
CREATE POLICY "Admins full access on vocab_embeddings"
  ON public.vocab_embeddings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage vocab_embeddings"
  ON public.vocab_embeddings
  FOR ALL
  USING (has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can read vocab_embeddings"
  ON public.vocab_embeddings
  FOR SELECT
  USING (true);

-- Add trigger for updated_at on explain_features
CREATE TRIGGER update_explain_features_updated_at
  BEFORE UPDATE ON public.explain_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();