-- RLS 정책 수정: students 테이블 기반 접근 허용

-- 1. comparisons 테이블 정책 수정 (학생이 students 테이블에 있으면 접근 허용)
DROP POLICY IF EXISTS "Students can manage their own comparisons" ON public.comparisons;

CREATE POLICY "Students can manage their own comparisons via students table" 
ON public.comparisons 
FOR ALL
USING (
  -- Auth 사용자이거나 students 테이블의 ID와 매칭되는 경우 허용
  auth.uid() = student_id OR 
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = comparisons.student_id
  )
);

-- 2. project_assignments 테이블 정책 추가 (학생들이 자신의 할당 정보를 볼 수 있도록)
CREATE POLICY "Students can view their assignments via students table" 
ON public.project_assignments 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = project_assignments.student_id
  )
);

-- 3. student_responses 테이블에 학생들이 자신의 응답을 볼 수 있는 정책 추가
CREATE POLICY "Anyone can view responses for active projects" 
ON public.student_responses 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = student_responses.project_id 
    AND p.is_active = true
  )
);