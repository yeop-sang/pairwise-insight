-- 1. Add new columns to aggregated_scores table
ALTER TABLE aggregated_scores
ADD COLUMN IF NOT EXISTS q1_score real,
ADD COLUMN IF NOT EXISTS q2_score real,
ADD COLUMN IF NOT EXISTS q3_score real,
ADD COLUMN IF NOT EXISTS q4_score real,
ADD COLUMN IF NOT EXISTS q5_score real,
ADD COLUMN IF NOT EXISTS total_score real,
ADD COLUMN IF NOT EXISTS rank integer;

-- 2. Copy existing score to total_score for backward compatibility
UPDATE aggregated_scores 
SET total_score = score 
WHERE total_score IS NULL;

-- 3. Add indexes for performance (skip if already exists)
CREATE INDEX IF NOT EXISTS aggregated_scores_total_score_idx ON aggregated_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS aggregated_scores_rank_idx ON aggregated_scores(rank);

-- 4. Add comment for documentation
COMMENT ON COLUMN aggregated_scores.q1_score IS 'Score for question 1';
COMMENT ON COLUMN aggregated_scores.q2_score IS 'Score for question 2';
COMMENT ON COLUMN aggregated_scores.q3_score IS 'Score for question 3';
COMMENT ON COLUMN aggregated_scores.q4_score IS 'Score for question 4';
COMMENT ON COLUMN aggregated_scores.q5_score IS 'Score for question 5';
COMMENT ON COLUMN aggregated_scores.total_score IS 'Total aggregated score across all questions';
COMMENT ON COLUMN aggregated_scores.rank IS 'Rank based on total_score within project';

-- 5. Update RLS policies for stricter student access
-- Drop old policy and create new one with correct student access
DROP POLICY IF EXISTS "Students can read own aggregated_scores" ON aggregated_scores;

CREATE POLICY "Students can read own aggregated_scores" ON aggregated_scores
  FOR SELECT
  USING (
    response_id IN (
      SELECT sr.id 
      FROM student_responses sr
      JOIN students s ON sr.student_id = s.id
      WHERE s.id IN (
        SELECT id FROM students 
        WHERE student_id = current_setting('request.jwt.claims', true)::json->>'student_id'
      )
    )
  );

-- 6. Ensure teachers can manage their project data
-- This policy should already exist, but let's make sure it's correct
DROP POLICY IF EXISTS "Teachers can manage aggregated_scores for their projects" ON aggregated_scores;

CREATE POLICY "Teachers can manage aggregated_scores for their projects" ON aggregated_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = aggregated_scores.project_id
      AND p.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = aggregated_scores.project_id
      AND p.teacher_id = auth.uid()
    )
  );

-- 7. Ensure admins have full access (already exists, but verify)
DROP POLICY IF EXISTS "Admins full access on aggregated_scores" ON aggregated_scores;

CREATE POLICY "Admins full access on aggregated_scores" ON aggregated_scores
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));