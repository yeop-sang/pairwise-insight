-- Add foreign key between project_assignments and students
ALTER TABLE public.project_assignments
ADD CONSTRAINT fk_project_assignments_student_id 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;