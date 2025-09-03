-- Update completion status for students who have completed all 75 comparisons
UPDATE project_assignments 
SET 
  has_completed = true,
  completed_at = now()
WHERE project_id = '7b021ee4-59c9-404f-a058-cfa025eed6ba'
  AND student_id IN (
    SELECT pa.student_id
    FROM project_assignments pa
    LEFT JOIN comparisons c ON c.student_id = pa.student_id AND c.project_id = pa.project_id
    WHERE pa.project_id = '7b021ee4-59c9-404f-a058-cfa025eed6ba'
    GROUP BY pa.student_id
    HAVING COUNT(c.id) >= 75
  )
  AND has_completed = false;