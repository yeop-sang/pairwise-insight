import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StudentResponse {
  id: string;
  student_code: string;
  response_text: string;
  question_number: number;
}

interface ComparisonPair {
  responseA: StudentResponse;
  responseB: StudentResponse;
  uncertainty?: number; // For adaptive comparison
}

interface UseComparisonLogicProps {
  projectId: string;
  responses: StudentResponse[];
  studentId: string;
}

export const useComparisonLogic = ({ projectId, responses, studentId }: UseComparisonLogicProps) => {
  const [availablePairs, setAvailablePairs] = useState<ComparisonPair[]>([]);
  const [currentPair, setCurrentPair] = useState<ComparisonPair | null>(null);
  const [completedComparisons, setCompletedComparisons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (responses.length > 0) {
      initializeComparisons();
    }
  }, [responses, studentId]);

  const initializeComparisons = async () => {
    try {
      // Fetch existing comparisons for this student
      const { data: existingComparisons, error } = await supabase
        .from('comparisons')
        .select('response_a_id, response_b_id')
        .eq('project_id', projectId)
        .eq('student_id', studentId);

      if (error) throw error;

      const completedSet = new Set<string>();
      existingComparisons?.forEach(comp => {
        const pairKey1 = `${comp.response_a_id}-${comp.response_b_id}`;
        const pairKey2 = `${comp.response_b_id}-${comp.response_a_id}`;
        completedSet.add(pairKey1);
        completedSet.add(pairKey2);
      });

      setCompletedComparisons(completedSet);

      // Generate all possible pairs
      const pairs: ComparisonPair[] = [];
      for (let i = 0; i < responses.length; i++) {
        for (let j = i + 1; j < responses.length; j++) {
          const pairKey = `${responses[i].id}-${responses[j].id}`;
          if (!completedSet.has(pairKey)) {
            pairs.push({
              responseA: responses[i],
              responseB: responses[j],
              uncertainty: calculateUncertainty(responses[i], responses[j])
            });
          }
        }
      }

      // Sort by uncertainty (most uncertain first for adaptive comparison)
      pairs.sort((a, b) => (b.uncertainty || 0) - (a.uncertainty || 0));
      
      setAvailablePairs(pairs);
      if (pairs.length > 0) {
        setCurrentPair(pairs[0]);
      }
    } catch (error) {
      console.error('Error initializing comparisons:', error);
    }
  };

  const calculateUncertainty = (responseA: StudentResponse, responseB: StudentResponse): number => {
    // Simple heuristic: longer responses might be more uncertain to compare
    const lengthDiff = Math.abs(responseA.response_text.length - responseB.response_text.length);
    const avgLength = (responseA.response_text.length + responseB.response_text.length) / 2;
    return lengthDiff / Math.max(avgLength, 1);
  };

  const getNextComparison = (): ComparisonPair | null => {
    const remaining = availablePairs.filter(pair => {
      const pairKey1 = `${pair.responseA.id}-${pair.responseB.id}`;
      const pairKey2 = `${pair.responseB.id}-${pair.responseA.id}`;
      return !completedComparisons.has(pairKey1) && !completedComparisons.has(pairKey2);
    });

    return remaining.length > 0 ? remaining[0] : null;
  };

  const markPairAsCompleted = (responseAId: string, responseBId: string) => {
    const pairKey1 = `${responseAId}-${responseBId}`;
    const pairKey2 = `${responseBId}-${responseAId}`;
    
    setCompletedComparisons(prev => {
      const newSet = new Set(prev);
      newSet.add(pairKey1);
      newSet.add(pairKey2);
      return newSet;
    });

    const nextPair = getNextComparison();
    setCurrentPair(nextPair);
  };

  const getCompletionStats = () => {
    const totalPossiblePairs = (responses.length * (responses.length - 1)) / 2;
    const completedPairsCount = completedComparisons.size / 2; // Divided by 2 because we store both directions
    const progress = totalPossiblePairs > 0 ? (completedPairsCount / totalPossiblePairs) * 100 : 0;
    
    return {
      completed: completedPairsCount,
      total: totalPossiblePairs,
      progress: Math.round(progress),
      isComplete: completedPairsCount >= totalPossiblePairs
    };
  };

  return {
    currentPair,
    getNextComparison,
    markPairAsCompleted,
    getCompletionStats,
    hasMoreComparisons: () => getNextComparison() !== null
  };
};