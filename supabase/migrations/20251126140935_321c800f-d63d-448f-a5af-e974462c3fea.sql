-- Drop existing foreign key constraints and recreate with CASCADE delete
-- This ensures when a student is deleted, all related records are automatically removed

-- Fix project_assignments foreign key
ALTER TABLE project_assignments 
DROP CONSTRAINT IF EXISTS fk_project_assignments_student_id,
DROP CONSTRAINT IF EXISTS project_assignments_student_id_fkey;

ALTER TABLE project_assignments
ADD CONSTRAINT project_assignments_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

-- Fix student_responses foreign key
ALTER TABLE student_responses 
DROP CONSTRAINT IF EXISTS student_responses_student_id_fkey;

ALTER TABLE student_responses
ADD CONSTRAINT student_responses_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

-- Fix comparisons foreign key
ALTER TABLE comparisons 
DROP CONSTRAINT IF EXISTS comparisons_student_id_fkey;

ALTER TABLE comparisons
ADD CONSTRAINT comparisons_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

-- Fix reviewer_stats foreign key
ALTER TABLE reviewer_stats 
DROP CONSTRAINT IF EXISTS reviewer_stats_student_id_fkey;

ALTER TABLE reviewer_stats
ADD CONSTRAINT reviewer_stats_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;