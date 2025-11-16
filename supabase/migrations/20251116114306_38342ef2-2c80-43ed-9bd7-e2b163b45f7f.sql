-- Remove FK constraint from bt_scores
ALTER TABLE public.bt_scores 
DROP CONSTRAINT IF EXISTS bt_scores_response_id_fkey;

-- Change response_id column type from uuid to text
ALTER TABLE public.bt_scores 
ALTER COLUMN response_id TYPE text USING response_id::text;