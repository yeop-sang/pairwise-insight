-- Drop the old check constraint that only allowed 'A', 'B', 'tie'
ALTER TABLE public.comparisons 
DROP CONSTRAINT IF EXISTS comparisons_decision_check;

-- Add new check constraint with correct values: 'left', 'right', 'neutral'
ALTER TABLE public.comparisons 
ADD CONSTRAINT comparisons_decision_check 
CHECK (decision IN ('left', 'right', 'neutral'));