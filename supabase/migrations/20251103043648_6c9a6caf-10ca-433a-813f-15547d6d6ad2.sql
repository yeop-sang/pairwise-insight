-- Allow students (anon/authenticated) to read and create session metadata
-- This is needed for the comparison session to work properly

DROP POLICY IF EXISTS "Students can view session metadata" ON public.session_metadata;
DROP POLICY IF EXISTS "Students can create session metadata" ON public.session_metadata;

CREATE POLICY "Anyone can view session metadata"
ON public.session_metadata
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create session metadata"
ON public.session_metadata
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow reading and updating reviewer_stats for students
DROP POLICY IF EXISTS "Students can view their own stats" ON public.reviewer_stats;
DROP POLICY IF EXISTS "Students can update their own stats" ON public.reviewer_stats;

CREATE POLICY "Students can view reviewer stats"
ON public.reviewer_stats
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Students can insert reviewer stats"
ON public.reviewer_stats
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Students can update reviewer stats"
ON public.reviewer_stats
FOR UPDATE
TO anon, authenticated
USING (true);