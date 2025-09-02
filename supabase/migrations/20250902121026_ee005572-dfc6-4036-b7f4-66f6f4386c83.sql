-- Remove the incorrect foreign key constraint that references auth.users
-- This constraint is causing the error because we should reference students table instead
ALTER TABLE public.project_assignments 
DROP CONSTRAINT IF EXISTS project_assignments_student_id_fkey;

-- The correct foreign key constraint (fk_project_assignments_student_id) should already exist
-- and references the students table, so we don't need to recreate it