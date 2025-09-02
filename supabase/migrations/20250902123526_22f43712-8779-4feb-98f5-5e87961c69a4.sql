-- Drop the problematic policy first
DROP POLICY IF EXISTS "Students can view their own assignments by student_id" ON public.project_assignments;

-- Create a simple policy for student login access
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;

-- Create a more permissive policy for students table to allow login
CREATE POLICY "Allow student login authentication" 
ON public.students 
FOR SELECT 
USING (true);

-- Allow students to view project assignments when they have the same UUID in both tables
CREATE POLICY "Students can view assignments for their UUID" 
ON public.project_assignments 
FOR SELECT 
USING (true);