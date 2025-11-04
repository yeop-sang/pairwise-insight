-- Function to calculate ranking based on win/loss counts
CREATE OR REPLACE FUNCTION calculate_response_rankings(project_uuid UUID, question_num INTEGER)
RETURNS TABLE (
  response_id UUID,
  student_code TEXT,
  win_count BIGINT,
  loss_count BIGINT,
  tie_count BIGINT,
  total_comparisons BIGINT,
  win_rate NUMERIC,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH response_stats AS (
    SELECT 
      sr.id as response_id,
      sr.student_code,
      COUNT(CASE 
        WHEN c.decision = 'left' AND c.ui_order_left_id = sr.id THEN 1 
        WHEN c.decision = 'right' AND c.ui_order_right_id = sr.id THEN 1 
      END) as win_count,
      COUNT(CASE 
        WHEN c.decision = 'left' AND c.ui_order_right_id = sr.id THEN 1 
        WHEN c.decision = 'right' AND c.ui_order_left_id = sr.id THEN 1 
      END) as loss_count,
      COUNT(CASE 
        WHEN c.decision = 'tie' AND (c.ui_order_left_id = sr.id OR c.ui_order_right_id = sr.id) THEN 1 
      END) as tie_count,
      COUNT(CASE 
        WHEN c.ui_order_left_id = sr.id OR c.ui_order_right_id = sr.id THEN 1 
      END) as total_comparisons
    FROM student_responses sr
    LEFT JOIN comparisons c ON c.project_id = sr.project_id 
      AND c.question_number = sr.question_number
      AND (c.ui_order_left_id = sr.id OR c.ui_order_right_id = sr.id)
    WHERE sr.project_id = project_uuid
      AND sr.question_number = question_num
    GROUP BY sr.id, sr.student_code
  )
  SELECT 
    rs.response_id,
    rs.student_code,
    rs.win_count,
    rs.loss_count,
    rs.tie_count,
    rs.total_comparisons,
    CASE 
      WHEN rs.total_comparisons > 0 THEN ROUND((rs.win_count::NUMERIC / rs.total_comparisons) * 100, 1)
      ELSE 0 
    END as win_rate,
    RANK() OVER (ORDER BY rs.win_count DESC, 
      CASE WHEN rs.total_comparisons > 0 THEN rs.win_count::NUMERIC / rs.total_comparisons ELSE 0 END DESC
    )::INTEGER as rank
  FROM response_stats rs
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql STABLE;