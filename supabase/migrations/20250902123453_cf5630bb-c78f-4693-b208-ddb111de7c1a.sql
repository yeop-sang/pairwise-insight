-- Allow students to view their own data for authentication
CREATE POLICY "Students can view their own data" 
ON public.students 
FOR SELECT 
USING (true);

-- Allow students to view project assignments for their student ID
CREATE POLICY "Students can view their own assignments by student_id" 
ON public.project_assignments 
FOR SELECT 
USING (student_id = (
  SELECT id FROM students 
  WHERE student_id = current_setting('request.jwt.claims', true)::json->>'student_id'
));