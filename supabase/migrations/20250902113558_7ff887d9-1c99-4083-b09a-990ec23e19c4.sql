-- Drop the existing unique constraint that's causing the error
ALTER TABLE public.student_responses 
DROP CONSTRAINT IF EXISTS student_responses_project_id_student_code_key;

-- Create a new unique constraint that includes question_number
ALTER TABLE public.student_responses 
ADD CONSTRAINT student_responses_project_id_student_code_question_number_key 
UNIQUE (project_id, student_code, question_number);