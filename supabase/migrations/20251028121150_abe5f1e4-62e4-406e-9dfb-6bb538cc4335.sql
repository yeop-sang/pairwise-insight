-- Add missing columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS question TEXT,
ADD COLUMN IF NOT EXISTS rubric TEXT;

-- Add missing column to student_responses table
ALTER TABLE public.student_responses 
ADD COLUMN IF NOT EXISTS student_code TEXT;

-- Add missing column to project_assignments table
ALTER TABLE public.project_assignments 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now();