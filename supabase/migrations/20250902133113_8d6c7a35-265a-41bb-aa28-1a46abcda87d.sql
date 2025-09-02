-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION calculate_bradley_terry_scores(project_uuid UUID)
RETURNS TABLE(
  response_id UUID,
  student_code TEXT,
  score FLOAT,
  win_count INT,
  loss_count INT,
  total_comparisons INT,
  rank INT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH comparison_data AS (
    SELECT 
      sr.id as response_id,
      sr.student_code,
      COUNT(CASE WHEN c.decision = 'left' AND c.response_a_id = sr.id THEN 1 
                 WHEN c.decision = 'right' AND c.response_b_id = sr.id THEN 1 END) as wins,
      COUNT(CASE WHEN c.decision = 'left' AND c.response_b_id = sr.id THEN 1 
                 WHEN c.decision = 'right' AND c.response_a_id = sr.id THEN 1 END) as losses,
      COUNT(c.id) as total_comps
    FROM student_responses sr
    LEFT JOIN comparisons c ON (c.response_a_id = sr.id OR c.response_b_id = sr.id)
    WHERE sr.project_id = project_uuid
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
    RANK() OVER (ORDER BY s.bt_score DESC, s.wins DESC) as rank_num
  FROM scores s
  ORDER BY s.bt_score DESC, s.wins DESC;
END;
$$;