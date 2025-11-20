-- Add missing columns to feature_summary before renaming
ALTER TABLE public.feature_summary 
  ADD COLUMN IF NOT EXISTS question_number INTEGER,
  ADD COLUMN IF NOT EXISTS top_k INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS model_type TEXT NOT NULL DEFAULT 'autoscore-ridge';

-- Update question_number for existing rows (if any) - set to 1 as default
UPDATE public.feature_summary SET question_number = 1 WHERE question_number IS NULL;

-- Make question_number NOT NULL after setting defaults
ALTER TABLE public.feature_summary ALTER COLUMN question_number SET NOT NULL;

-- Rename feature_summary to explain_features
ALTER TABLE public.feature_summary RENAME TO explain_features;

-- Rename indexes
ALTER INDEX idx_feature_summary_project_id RENAME TO idx_explain_features_project_id;
ALTER INDEX idx_feature_summary_run_id RENAME TO idx_explain_features_run_id;

-- Add index for question_number
CREATE INDEX idx_explain_features_question ON public.explain_features(question_number);

-- Update RLS policy names (drop old ones and create new ones with correct table name)
DROP POLICY IF EXISTS "Admins full access on feature_summary" ON public.explain_features;
DROP POLICY IF EXISTS "Teachers can manage feature_summary for their projects" ON public.explain_features;
DROP POLICY IF EXISTS "Students can read feature_summary for active projects" ON public.explain_features;

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