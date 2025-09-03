-- Drop and recreate the Bradley-Terry function with correct integer types
DROP FUNCTION IF EXISTS calculate_bradley_terry_by_question(uuid, integer);

CREATE OR REPLACE FUNCTION calculate_bradley_terry_by_question(
  project_uuid UUID,
  question_num INTEGER
)
RETURNS TABLE (
  response_id UUID,
  student_code TEXT,
  score DOUBLE PRECISION,
  win_count INTEGER,
  loss_count INTEGER,
  total_comparisons INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH comparison_data AS (
    SELECT 
      sr.id as response_id,
      sr.student_code,
      COUNT(CASE WHEN c.decision = 'left' AND c.response_a_id = sr.id THEN 1 
                 WHEN c.decision = 'right' AND c.response_b_id = sr.id THEN 1 END)::integer as wins,
      COUNT(CASE WHEN c.decision = 'left' AND c.response_b_id = sr.id THEN 1 
                 WHEN c.decision = 'right' AND c.response_a_id = sr.id THEN 1 END)::integer as losses,
      COUNT(c.id)::integer as total_comps
    FROM student_responses sr
    LEFT JOIN comparisons c ON (c.response_a_id = sr.id OR c.response_b_id = sr.id)
    WHERE sr.project_id = project_uuid 
      AND sr.question_number = question_num
    GROUP BY sr.id, sr.student_code
  ),
  scores AS (
    SELECT 
      cd.*,
      CASE 
        WHEN cd.total_comps = 0 THEN 0.5
        ELSE cd.wins::FLOAT / GREATEST(cd.total_comps, 1)
      END as bt_score
    FROM comparison_data cd
  )
  SELECT 
    s.response_id,
    s.student_code,
    s.bt_score,
    s.wins,
    s.losses,
    s.total_comps,
    RANK() OVER (ORDER BY s.bt_score DESC, s.wins DESC)::integer as rank_num
  FROM scores s
  ORDER BY s.bt_score DESC, s.wins DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';