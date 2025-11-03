-- Allow students (anon/authenticated users) to view active projects
-- This is needed for the student dashboard to display assigned projects
CREATE POLICY "Anyone can view active projects"
ON public.projects
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Also update project_assignments policy to be more permissive for anon users
DROP POLICY IF EXISTS "Students can view their own assignments" ON public.project_assignments;

CREATE POLICY "Students can view project assignments"
ON public.project_assignments
FOR SELECT
TO anon, authenticated
USING (true);