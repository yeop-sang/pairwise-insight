-- Function to calculate overall rankings across all questions for a student
CREATE OR REPLACE FUNCTION calculate_overall_student_rankings(project_uuid UUID)
RETURNS TABLE (
  student_code TEXT,
  total_win_count BIGINT,
  total_loss_count BIGINT,
  total_tie_count BIGINT,
  total_comparisons BIGINT,
  overall_win_rate NUMERIC,
  questions_participated INTEGER,
  rank INTEGER
) 
LANGUAGE plpgsql 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH student_stats AS (
    SELECT 
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
      END) as total_comps,
      COUNT(DISTINCT sr.question_number) as q_participated
    FROM student_responses sr
    LEFT JOIN comparisons c ON c.project_id = sr.project_id 
      AND c.question_number = sr.question_number
      AND (c.ui_order_left_id = sr.id OR c.ui_order_right_id = sr.id)
    WHERE sr.project_id = project_uuid
    GROUP BY sr.student_code
  )
  SELECT 
    ss.student_code,
    ss.win_count,
    ss.loss_count,
    ss.tie_count,
    ss.total_comps,
    CASE 
      WHEN ss.total_comps > 0 THEN ROUND((ss.win_count::NUMERIC / ss.total_comps) * 100, 1)
      ELSE 0 
    END as overall_win_rate,
    ss.q_participated,
    RANK() OVER (ORDER BY ss.win_count DESC, 
      CASE WHEN ss.total_comps > 0 THEN ss.win_count::NUMERIC / ss.total_comps ELSE 0 END DESC
    )::INTEGER as rank
  FROM student_stats ss
  ORDER BY rank;
END;
$$;

-- Function to get head-to-head comparison details between responses
CREATE OR REPLACE FUNCTION get_headtohead_comparisons(project_uuid UUID, question_num INTEGER)
RETURNS TABLE (
  response_a_code TEXT,
  response_b_code TEXT,
  a_wins BIGINT,
  b_wins BIGINT,
  ties BIGINT,
  total_comparisons BIGINT
) 
LANGUAGE plpgsql 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH comparison_pairs AS (
    SELECT 
      sr_a.student_code as code_a,
      sr_b.student_code as code_b,
      COUNT(CASE 
        WHEN c.decision = 'left' AND c.ui_order_left_id = sr_a.id THEN 1
        WHEN c.decision = 'right' AND c.ui_order_right_id = sr_a.id THEN 1
      END) as a_win,
      COUNT(CASE 
        WHEN c.decision = 'left' AND c.ui_order_left_id = sr_b.id THEN 1
        WHEN c.decision = 'right' AND c.ui_order_right_id = sr_b.id THEN 1
      END) as b_win,
      COUNT(CASE WHEN c.decision = 'tie' THEN 1 END) as tie_count,
      COUNT(*) as total
    FROM comparisons c
    JOIN student_responses sr_a ON (c.ui_order_left_id = sr_a.id OR c.ui_order_right_id = sr_a.id)
    JOIN student_responses sr_b ON (c.ui_order_left_id = sr_b.id OR c.ui_order_right_id = sr_b.id)
    WHERE c.project_id = project_uuid
      AND c.question_number = question_num
      AND sr_a.id != sr_b.id
      AND ((c.ui_order_left_id = sr_a.id AND c.ui_order_right_id = sr_b.id) 
           OR (c.ui_order_left_id = sr_b.id AND c.ui_order_right_id = sr_a.id))
    GROUP BY sr_a.student_code, sr_b.student_code
  )
  SELECT 
    cp.code_a,
    cp.code_b,
    cp.a_win,
    cp.b_win,
    cp.tie_count,
    cp.total
  FROM comparison_pairs cp
  ORDER BY cp.code_a, cp.code_b;
END;
$$;