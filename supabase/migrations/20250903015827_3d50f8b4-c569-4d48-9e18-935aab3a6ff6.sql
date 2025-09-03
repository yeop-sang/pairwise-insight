-- Fix Bradley-Terry function return type to match expected integer type
CREATE OR REPLACE FUNCTION calculate_bradley_terry_by_question(
  input_project_id UUID,
  input_question_number INTEGER
)
RETURNS TABLE (
  student_code TEXT,
  score NUMERIC,
  rank INTEGER,
  total_comparisons INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH comparison_data AS (
    SELECT 
      sr_a.student_code,
      COUNT(CASE WHEN c.decision = 'A' THEN 1 END)::integer as wins,
      COUNT(c.id)::integer as total_matches
    FROM comparisons c
    JOIN student_responses sr_a ON c.response_a_id = sr_a.id
    JOIN student_responses sr_b ON c.response_b_id = sr_b.id
    WHERE c.project_id = input_project_id 
      AND sr_a.question_number = input_question_number
      AND sr_b.question_number = input_question_number
    GROUP BY sr_a.student_code
    
    UNION ALL
    
    SELECT 
      sr_b.student_code,
      COUNT(CASE WHEN c.decision = 'B' THEN 1 END)::integer as wins,
      COUNT(c.id)::integer as total_matches
    FROM comparisons c
    JOIN student_responses sr_a ON c.response_a_id = sr_a.id
    JOIN student_responses sr_b ON c.response_b_id = sr_b.id
    WHERE c.project_id = input_project_id 
      AND sr_a.question_number = input_question_number
      AND sr_b.question_number = input_question_number
    GROUP BY sr_b.student_code
  ),
  aggregated_data AS (
    SELECT 
      student_code,
      SUM(wins) as total_wins,
      SUM(total_matches) as total_comparisons
    FROM comparison_data
    GROUP BY student_code
  ),
  bradley_terry_scores AS (
    SELECT 
      student_code,
      CASE 
        WHEN total_comparisons > 0 THEN 
          LN(GREATEST(total_wins::numeric / GREATEST(total_comparisons - total_wins, 1), 0.01))
        ELSE 0 
      END as score,
      total_comparisons::integer
    FROM aggregated_data
  )
  SELECT 
    bts.student_code,
    bts.score,
    RANK() OVER (ORDER BY bts.score DESC)::integer as rank,
    bts.total_comparisons
  FROM bradley_terry_scores bts
  ORDER BY bts.score DESC;
END;
$$ LANGUAGE plpgsql;