-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS response_embeddings_response_id_idx ON response_embeddings(response_id);
CREATE INDEX IF NOT EXISTS response_embeddings_project_id_idx ON response_embeddings(project_id);
CREATE INDEX IF NOT EXISTS response_embeddings_question_number_idx ON response_embeddings(question_number);

CREATE INDEX IF NOT EXISTS bt_runs_project_id_idx ON bt_runs(project_id);
CREATE INDEX IF NOT EXISTS bt_runs_status_idx ON bt_runs(status);

CREATE INDEX IF NOT EXISTS bt_scores_project_id_idx ON bt_scores(project_id);
CREATE INDEX IF NOT EXISTS bt_scores_response_id_idx ON bt_scores(response_id);
CREATE INDEX IF NOT EXISTS bt_scores_run_id_idx ON bt_scores(run_id);
CREATE INDEX IF NOT EXISTS bt_scores_question_number_idx ON bt_scores(question_number);

CREATE INDEX IF NOT EXISTS aggregated_scores_project_id_idx ON aggregated_scores(project_id);
CREATE INDEX IF NOT EXISTS aggregated_scores_response_id_idx ON aggregated_scores(response_id);
CREATE INDEX IF NOT EXISTS aggregated_scores_run_id_idx ON aggregated_scores(run_id);

CREATE INDEX IF NOT EXISTS autoscore_runs_project_id_idx ON autoscore_runs(project_id);
CREATE INDEX IF NOT EXISTS autoscore_runs_question_number_idx ON autoscore_runs(question_number);
CREATE INDEX IF NOT EXISTS autoscore_runs_status_idx ON autoscore_runs(status);

CREATE INDEX IF NOT EXISTS autoscore_predictions_project_id_idx ON autoscore_predictions(project_id);
CREATE INDEX IF NOT EXISTS autoscore_predictions_question_number_idx ON autoscore_predictions(question_number);

CREATE INDEX IF NOT EXISTS explain_features_project_id_idx ON explain_features(project_id);
CREATE INDEX IF NOT EXISTS explain_features_question_number_idx ON explain_features(question_number);
CREATE INDEX IF NOT EXISTS explain_features_run_id_idx ON explain_features(run_id);
CREATE INDEX IF NOT EXISTS explain_features_created_at_idx ON explain_features(created_at);

CREATE INDEX IF NOT EXISTS feature_words_project_id_idx ON feature_words(project_id);
CREATE INDEX IF NOT EXISTS feature_words_run_id_idx ON feature_words(run_id);
CREATE INDEX IF NOT EXISTS feature_words_word_idx ON feature_words(word);

CREATE INDEX IF NOT EXISTS vocab_embeddings_word_idx ON vocab_embeddings(word);
CREATE INDEX IF NOT EXISTS vocab_embeddings_model_id_idx ON vocab_embeddings(model_id);

-- Update RLS policies for stricter access control

-- 1. explain_features: 학생 접근 제한
DROP POLICY IF EXISTS "Students can read explain_features for active projects" ON explain_features;

-- 2. bt_runs: 학생 접근 제한
DROP POLICY IF EXISTS "Students can read bt_runs for active projects" ON bt_runs;

-- 3. autoscore_runs: 학생 접근 제한  
DROP POLICY IF EXISTS "Students read autoscore_runs of active projects" ON autoscore_runs;

-- 4. vocab_embeddings: 학생 접근 제한, 교사는 읽기만
DROP POLICY IF EXISTS "Students can read vocab_embeddings" ON vocab_embeddings;
DROP POLICY IF EXISTS "Teachers can manage vocab_embeddings" ON vocab_embeddings;

CREATE POLICY "Teachers can read vocab_embeddings" ON vocab_embeddings
  FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

-- 5. bt_scores: 학생은 자기 response만
DROP POLICY IF EXISTS "Students can read bt_scores for active projects" ON bt_scores;

CREATE POLICY "Students can read own bt_scores" ON bt_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_responses sr
      WHERE sr.id = bt_scores.response_id
      AND sr.student_id IN (
        SELECT id FROM students WHERE id = (
          SELECT id FROM students LIMIT 1
        )
      )
    )
  );

-- 6. aggregated_scores: 학생은 자기 response만
DROP POLICY IF EXISTS "Students can read aggregated_scores for active projects" ON aggregated_scores;

CREATE POLICY "Students can read own aggregated_scores" ON aggregated_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_responses sr
      WHERE sr.id = aggregated_scores.response_id
      AND sr.student_id IN (
        SELECT id FROM students LIMIT 1
      )
    )
  );

-- 7. autoscore_predictions: 학생은 자기 것만
DROP POLICY IF EXISTS "Students read autoscore_predictions of active projects" ON autoscore_predictions;

CREATE POLICY "Students can read own autoscore_predictions" ON autoscore_predictions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_responses sr
      WHERE sr.project_id = autoscore_predictions.project_id
      AND sr.question_number = autoscore_predictions.question_number
      AND sr.response_text = autoscore_predictions.response_text
      AND sr.student_id IN (
        SELECT id FROM students LIMIT 1
      )
    )
  );