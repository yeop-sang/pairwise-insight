-- Drop the existing unique constraint that prevents multiple responses per student
ALTER TABLE public.student_responses DROP CONSTRAINT IF EXISTS student_responses_project_id_student_code_key;

-- Add a new unique constraint that allows multiple responses per student for different questions
ALTER TABLE public.student_responses ADD CONSTRAINT student_responses_project_student_question_unique 
UNIQUE (project_id, student_code, question_number);