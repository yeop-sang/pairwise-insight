-- Create user_experience_feedback table for collecting student feedback after grading
CREATE TABLE public.user_experience_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  positive_feedback TEXT,
  improvement_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_experience_feedback ENABLE ROW LEVEL SECURITY;

-- Students can insert their own feedback
CREATE POLICY "Students can insert their own feedback"
ON public.user_experience_feedback
FOR INSERT
WITH CHECK (true);

-- Students can view their own feedback
CREATE POLICY "Students can view their own feedback"
ON public.user_experience_feedback
FOR SELECT
USING (true);

-- Teachers can view feedback for their projects
CREATE POLICY "Teachers can view feedback for their projects"
ON public.user_experience_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = user_experience_feedback.project_id
    AND p.teacher_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_user_experience_feedback_project ON public.user_experience_feedback(project_id);
CREATE INDEX idx_user_experience_feedback_student ON public.user_experience_feedback(student_id);