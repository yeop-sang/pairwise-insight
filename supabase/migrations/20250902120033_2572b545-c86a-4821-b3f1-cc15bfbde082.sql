-- Add foreign key constraint between project_assignments and students
ALTER TABLE public.project_assignments 
ADD CONSTRAINT fk_project_assignments_student_id 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Add foreign key constraint between project_assignments and projects
ALTER TABLE public.project_assignments 
ADD CONSTRAINT fk_project_assignments_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;