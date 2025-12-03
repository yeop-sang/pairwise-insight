-- Create student_feedback table for storing AI-generated feedback
CREATE TABLE public.student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  response_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  original_response TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  custom_direction TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_student_feedback_project_question ON public.student_feedback(project_id, question_number);
CREATE INDEX idx_student_feedback_response ON public.student_feedback(response_id);

-- RLS Policies
CREATE POLICY "Teachers can manage feedback for their projects"
ON public.student_feedback
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = student_feedback.project_id
  AND p.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = student_feedback.project_id
  AND p.teacher_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_student_feedback_updated_at
BEFORE UPDATE ON public.student_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();