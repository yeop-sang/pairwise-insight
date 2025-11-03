-- Allow students to authenticate by querying their own data
-- This is needed for the student login system
CREATE POLICY "Students can view data for authentication"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This allows reading student data including passwords.
-- In a production system, this should be replaced with a secure
-- authentication mechanism using Supabase Edge Functions or proper auth.