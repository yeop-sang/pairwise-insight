-- Fix RLS policies for student authentication system

-- Add policy to allow students to insert session metadata for active projects
CREATE POLICY "Students can create session metadata for active projects" 
ON session_metadata 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = session_metadata.project_id 
  AND p.is_active = true
));

-- Add policy to allow students to update session metadata for active projects
CREATE POLICY "Students can update session metadata for active projects" 
ON session_metadata 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = session_metadata.project_id 
  AND p.is_active = true
));

-- Ensure comparisons table allows inserts for students via students table
-- (The existing policy should work, but let's make it explicit)
DROP POLICY IF EXISTS "Students can insert their own comparisons via students table" ON comparisons;
CREATE POLICY "Students can insert their own comparisons via students table" 
ON comparisons 
FOR INSERT 
WITH CHECK ((auth.uid() = student_id) OR (EXISTS (
  SELECT 1 FROM students s 
  WHERE s.id = comparisons.student_id
)));

-- Ensure reviewer_stats table allows inserts for students via students table  
DROP POLICY IF EXISTS "Students can insert their own stats via students table" ON reviewer_stats;
CREATE POLICY "Students can insert their own stats via students table" 
ON reviewer_stats 
FOR INSERT 
WITH CHECK ((student_id = auth.uid()) OR (EXISTS (
  SELECT 1 FROM students s 
  WHERE s.id = reviewer_stats.student_id
)));