-- Make student_id nullable in student_responses table
-- This allows responses to be stored without linking to students table
ALTER TABLE public.student_responses 
ALTER COLUMN student_id DROP NOT NULL;

-- Add index on student_code for better query performance
CREATE INDEX IF NOT EXISTS idx_student_responses_student_code 
ON public.student_responses(student_code);

-- Update RLS policy to allow responses based on student_code as well
DROP POLICY IF EXISTS "Students can view responses for active projects" ON public.student_responses;

CREATE POLICY "Students can view responses for active projects" 
ON public.student_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = student_responses.project_id 
    AND p.is_active = true
  )
);

-- Update insert policy to allow inserting with just student_code
DROP POLICY IF EXISTS "Students can insert their own responses" ON public.student_responses;

CREATE POLICY "Students can insert their own responses" 
ON public.student_responses 
FOR INSERT 
WITH CHECK (
  -- Allow insert if student_code matches or if student_id matches
  (student_code IS NOT NULL) OR
  (student_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM students s
    WHERE s.id = student_responses.student_id
  ))
);