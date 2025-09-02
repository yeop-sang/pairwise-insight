-- Add question_number column to student_responses table to support multiple questions per project
ALTER TABLE public.student_responses 
ADD COLUMN question_number INTEGER NOT NULL DEFAULT 1;

-- Create a unique constraint that allows multiple responses per student for different questions
ALTER TABLE public.student_responses 
ADD CONSTRAINT student_responses_project_student_question_unique 
UNIQUE (project_id, student_code, question_number);