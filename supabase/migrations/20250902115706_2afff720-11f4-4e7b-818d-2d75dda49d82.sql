-- Drop the existing students table and recreate with better structure
DROP TABLE IF EXISTS public.students CASCADE;

-- Create a global students table (not tied to specific projects)
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL UNIQUE, -- abc_학년반번호 format
  password text NOT NULL, -- 학년반번호 format
  grade integer NOT NULL,
  class_number integer NOT NULL,
  student_number integer NOT NULL,
  name text NOT NULL,
  teacher_id uuid NOT NULL, -- Link to the teacher who created this student
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update project_assignments to track which students are assigned to which projects
-- and their completion status
ALTER TABLE public.project_assignments 
ADD COLUMN has_completed boolean NOT NULL DEFAULT false,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;

-- Enable RLS on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Teachers can manage their own students" 
ON public.students 
FOR ALL 
USING (auth.uid() = teacher_id);

-- Create trigger for timestamps
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX idx_students_grade_class ON public.students(grade, class_number);