-- Drop all foreign key constraints that reference student_responses.id
ALTER TABLE public.comparisons DROP CONSTRAINT IF EXISTS comparisons_response_a_id_fkey;
ALTER TABLE public.comparisons DROP CONSTRAINT IF EXISTS comparisons_response_b_id_fkey;
ALTER TABLE public.comparisons DROP CONSTRAINT IF EXISTS comparisons_ui_order_left_id_fkey;
ALTER TABLE public.comparisons DROP CONSTRAINT IF EXISTS comparisons_ui_order_right_id_fkey;
ALTER TABLE public.response_embeddings DROP CONSTRAINT IF EXISTS response_embeddings_response_id_fkey;
ALTER TABLE public.aggregated_scores DROP CONSTRAINT IF EXISTS aggregated_scores_response_id_fkey;

-- 1) Change student_responses.id to TEXT
ALTER TABLE public.student_responses
ALTER COLUMN id TYPE text USING id::text;

-- 2) Ensure response_embeddings.response_id is TEXT (already done, but confirming)
ALTER TABLE public.response_embeddings
ALTER COLUMN response_id TYPE text USING response_id::text;

-- 3) Change aggregated_scores.response_id to TEXT
ALTER TABLE public.aggregated_scores
ALTER COLUMN response_id TYPE text USING response_id::text;

-- Also convert comparison table columns to TEXT
ALTER TABLE public.comparisons
ALTER COLUMN response_a_id TYPE text USING response_a_id::text;

ALTER TABLE public.comparisons
ALTER COLUMN response_b_id TYPE text USING response_b_id::text;

ALTER TABLE public.comparisons
ALTER COLUMN ui_order_left_id TYPE text USING ui_order_left_id::text;

ALTER TABLE public.comparisons
ALTER COLUMN ui_order_right_id TYPE text USING ui_order_right_id::text;