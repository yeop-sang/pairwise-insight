-- Step 1: Drop the foreign key constraint
ALTER TABLE public.response_embeddings
DROP CONSTRAINT IF EXISTS response_embeddings_response_id_fkey;

-- Step 2: Change response_id column type from uuid to text
ALTER TABLE public.response_embeddings
ALTER COLUMN response_id TYPE text
USING response_id::text;

-- Step 3: Recreate the foreign key constraint (if needed, but student_responses.id is still uuid)
-- Note: This will only work if student_responses.id is also converted to text
-- For now, we're removing the constraint to allow the type change