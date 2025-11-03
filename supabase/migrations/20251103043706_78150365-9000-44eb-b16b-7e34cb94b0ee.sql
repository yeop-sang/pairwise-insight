-- Allow students to insert comparisons
-- This is needed for students to save their comparison choices

CREATE POLICY "Students can insert comparisons"
ON public.comparisons
FOR INSERT
TO anon, authenticated
WITH CHECK (true);