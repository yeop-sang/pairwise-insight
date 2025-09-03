-- Add questions column to projects table to store question prompts from Excel
ALTER TABLE public.projects 
ADD COLUMN questions JSONB DEFAULT '[]'::jsonb;

-- Add a comment for clarity
COMMENT ON COLUMN public.projects.questions IS 'Array of question prompts extracted from Excel headers';