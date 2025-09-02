-- Create students table for managing students in projects
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  student_id text NOT NULL UNIQUE, -- abc_학년반번호 format
  password text NOT NULL, -- 학년반번호 format
  grade integer NOT NULL,
  class_number integer NOT NULL,
  student_number integer NOT NULL,
  name text NOT NULL,
  has_completed boolean NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can manage students for their projects" 
ON public.students 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = students.project_id 
  AND projects.teacher_id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_students_project_id ON public.students(project_id);
CREATE INDEX idx_students_student_id ON public.students(student_id);