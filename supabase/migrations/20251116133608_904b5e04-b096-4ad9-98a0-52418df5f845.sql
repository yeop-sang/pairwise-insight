-- Step 1: Delete all existing data from dependent tables first
TRUNCATE TABLE public.comparisons CASCADE;
TRUNCATE TABLE public.bt_scores CASCADE;
TRUNCATE TABLE public.response_embeddings CASCADE;
TRUNCATE TABLE public.aggregated_scores CASCADE;
TRUNCATE TABLE public.autoscore_predictions CASCADE;
TRUNCATE TABLE public.reviewer_stats CASCADE;
TRUNCATE TABLE public.student_responses CASCADE;

-- Step 2: Convert columns to UUID
ALTER TABLE public.student_responses
    ALTER COLUMN id TYPE uuid 
    USING id::uuid;

ALTER TABLE public.bt_scores
    ALTER COLUMN response_id TYPE uuid 
    USING response_id::uuid;

ALTER TABLE public.response_embeddings
    ALTER COLUMN response_id TYPE uuid 
    USING response_id::uuid;

ALTER TABLE public.aggregated_scores
    ALTER COLUMN response_id TYPE uuid 
    USING response_id::uuid;

ALTER TABLE public.comparisons
    ALTER COLUMN response_a_id TYPE uuid 
    USING response_a_id::uuid;

ALTER TABLE public.comparisons
    ALTER COLUMN response_b_id TYPE uuid 
    USING response_b_id::uuid;

ALTER TABLE public.comparisons
    ALTER COLUMN ui_order_left_id TYPE uuid 
    USING ui_order_left_id::uuid;

ALTER TABLE public.comparisons
    ALTER COLUMN ui_order_right_id TYPE uuid 
    USING ui_order_right_id::uuid;

-- Step 3: Re-establish Foreign Keys
ALTER TABLE public.bt_scores
    ADD CONSTRAINT bt_scores_response_id_fkey
    FOREIGN KEY (response_id) 
    REFERENCES public.student_responses(id)
    ON DELETE CASCADE;

ALTER TABLE public.response_embeddings
    ADD CONSTRAINT response_embeddings_response_id_fkey
    FOREIGN KEY (response_id) 
    REFERENCES public.student_responses(id)
    ON DELETE CASCADE;

ALTER TABLE public.aggregated_scores
    ADD CONSTRAINT aggregated_scores_response_id_fkey
    FOREIGN KEY (response_id) 
    REFERENCES public.student_responses(id)
    ON DELETE CASCADE;

ALTER TABLE public.comparisons
    ADD CONSTRAINT comparisons_response_a_id_fkey
    FOREIGN KEY (response_a_id) 
    REFERENCES public.student_responses(id);

ALTER TABLE public.comparisons
    ADD CONSTRAINT comparisons_response_b_id_fkey
    FOREIGN KEY (response_b_id) 
    REFERENCES public.student_responses(id);

ALTER TABLE public.comparisons
    ADD CONSTRAINT comparisons_ui_order_left_id_fkey
    FOREIGN KEY (ui_order_left_id) 
    REFERENCES public.student_responses(id);

ALTER TABLE public.comparisons
    ADD CONSTRAINT comparisons_ui_order_right_id_fkey
    FOREIGN KEY (ui_order_right_id) 
    REFERENCES public.student_responses(id);

-- Step 4: Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_bt_scores_response_id 
    ON public.bt_scores(response_id);
CREATE INDEX IF NOT EXISTS idx_bt_scores_project_question 
    ON public.bt_scores(project_id, question_number);

CREATE INDEX IF NOT EXISTS idx_response_embeddings_response_id 
    ON public.response_embeddings(response_id);
CREATE INDEX IF NOT EXISTS idx_response_embeddings_project_question 
    ON public.response_embeddings(project_id, question_number);

CREATE INDEX IF NOT EXISTS idx_aggregated_scores_response_id 
    ON public.aggregated_scores(response_id);
CREATE INDEX IF NOT EXISTS idx_aggregated_scores_project 
    ON public.aggregated_scores(project_id);

CREATE INDEX IF NOT EXISTS idx_autoscore_runs_project 
    ON public.autoscore_runs(project_id, question_number);
CREATE INDEX IF NOT EXISTS idx_autoscore_predictions_project 
    ON public.autoscore_predictions(project_id, question_number);