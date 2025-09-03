import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ComparisonAlgorithm } from '@/utils/comparisonAlgorithm';

interface StudentResponse {
  id: string;
  student_code: string;
  response_text: string;
  question_number: number;
}

interface ComparisonPair {
  responseA: StudentResponse;
  responseB: StudentResponse;
}

interface UseAdvancedComparisonLogicProps {
  projectId: string;
  responses: StudentResponse[];
  reviewerId: string;
  currentQuestion: number;
}

export const useAdvancedComparisonLogic = ({ 
  projectId, 
  responses, 
  reviewerId,
  currentQuestion 
}: UseAdvancedComparisonLogicProps) => {
  const [currentPair, setCurrentPair] = useState<ComparisonPair | null>(null);
  const [algorithm, setAlgorithm] = useState<ComparisonAlgorithm | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    totalComparisons: 0,
    targetComparisons: 0,
    progress: 0,
    completedReviewers: 0,
    totalReviewers: 0,
    averageComparisonsPerResponse: 0,
    currentPhase: 'balance' as 'balance' | 'adaptive',
    isComplete: false
  });
  const [reviewerStats, setReviewerStats] = useState({
    completed: 0,
    remaining: 15,
    total: 15,
    progress: 0
  });

  // Improved own response checking
  const isOwnResponse = useMemo(() => {
    return (responseId: string) => {
      if (!reviewerId || !responses) return false;
      
      const response = responses.find(r => r.id === responseId);
      if (!response) return false;
      
      // Match student login ID with response student_code
      // reviewerId is the student's login ID (student_id from students table)
      // response.student_code is the student_code field from student_responses
      return response.student_code === reviewerId;
    };
  }, [reviewerId, responses]);

  const initializeAlgorithm = useCallback(async () => {
    try {
      setIsInitializing(true);
      
      if (!projectId || !responses || responses.length === 0 || !reviewerId) {
        console.log("Missing required data for initialization");
        return;
      }

      // Filter responses for current question only
      const currentQuestionResponses = responses.filter(r => r.question_number === currentQuestion);
      
      if (currentQuestionResponses.length === 0) {
        console.log(`No responses found for question ${currentQuestion}`);
        return;
      }

      console.log(`Initializing algorithm for question ${currentQuestion} with ${currentQuestionResponses.length} responses`);
      console.log(`Reviewer ID: ${reviewerId}`);
      console.log(`Current question responses:`, currentQuestionResponses.map(r => ({ id: r.id, student_code: r.student_code })));
      
      // Create new algorithm instance with only current question responses
      const newAlgorithm = new ComparisonAlgorithm(currentQuestionResponses, [reviewerId]);
      
      // Initialize with existing comparisons for current question only
      await newAlgorithm.initializeWithExistingComparisons(projectId, supabase);
      
      setAlgorithm(newAlgorithm);
      
      // Get initial pair
      const initialPair = newAlgorithm.getNextComparison(reviewerId);
      setCurrentPair(initialPair);
      
      updateStats(newAlgorithm);
      
      setIsInitializing(false);
    } catch (error) {
      console.error("Error initializing algorithm:", error);
      setIsInitializing(false);
    }
  }, [projectId, responses, reviewerId, currentQuestion]);

  const updateStats = useCallback((alg: ComparisonAlgorithm) => {
    const completion = alg.getCompletionStats();
    const reviewer = alg.getReviewerStats(reviewerId);
    
    setCompletionStats(completion);
    if (reviewer) {
      setReviewerStats(reviewer);
    }
  }, [reviewerId]);

  useEffect(() => {
    initializeAlgorithm();
  }, [initializeAlgorithm]);

  const submitComparison = useCallback(async (decision: 'A' | 'B') => {
    if (!algorithm || !currentPair || !projectId || !reviewerId) {
      console.error("Missing required data for comparison submission");
      return false;
    }

    try {
      const startTime = Date.now();
      
      // Map decision to database format
      const dbDecision = decision === 'A' ? 'left' : 'right';
      
      console.log(`Submitting comparison: ${currentPair.responseA.student_code} vs ${currentPair.responseB.student_code}, decision: ${decision}`);
      
      // Insert comparison into database
      const { error } = await supabase
        .from('comparisons')
        .insert({
          project_id: projectId,
          response_a_id: currentPair.responseA.id,
          response_b_id: currentPair.responseB.id,
          decision: dbDecision,
          student_id: reviewerId,
          comparison_time_ms: Date.now() - startTime
        });

      if (error) {
        console.error("Error saving comparison:", error);
        return false;
      }

      // Update algorithm state
      algorithm.processComparison(
        reviewerId,
        currentPair.responseA.id,
        currentPair.responseB.id,
        dbDecision
      );

      // Get next pair
      const nextPair = algorithm.getNextComparison(reviewerId);
      setCurrentPair(nextPair);
      
      // Update stats
      updateStats(algorithm);

      return true;
    } catch (error) {
      console.error("Error in submitComparison:", error);
      return false;
    }
  }, [algorithm, currentPair, projectId, reviewerId, updateStats]);

  const canContinue = useCallback(() => {
    if (!algorithm || !reviewerId) return false;
    const canCont = algorithm.canReviewerContinue(reviewerId);
    const stats = algorithm.getReviewerStats(reviewerId);
    console.log(`Can continue: ${canCont}, remaining: ${stats?.remaining}, completed: ${stats?.completed}`);
    return canCont;
  }, [algorithm, reviewerId]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (reviewerStats.remaining === 0) return null;
    
    // 평균 비교 시간을 30초로 가정
    const averageTimePerComparison = 30;
    const remainingSeconds = reviewerStats.remaining * averageTimePerComparison;
    
    if (remainingSeconds < 60) {
      return `${remainingSeconds}초`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)}분`;
    } else {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.round((remainingSeconds % 3600) / 60);
      return `${hours}시간 ${minutes}분`;
    }
  }, [reviewerStats.remaining]);

  const getCurrentPhaseInfo = useCallback(() => {
    if (!algorithm) return null;
    
    const stats = completionStats;
    return {
      phase: stats.currentPhase,
      description: stats.currentPhase === 'balance' 
        ? '균형 단계 - 모든 응답을 골고루 비교하고 있습니다'
        : '적응 단계 - 순위가 애매한 응답들을 중점 비교하고 있습니다',
      progress: stats.progress
    };
  }, [algorithm, completionStats]);

  return {
    // 상태
    currentPair,
    isInitializing,
    completionStats,
    reviewerStats,
    
    // 액션
    submitComparison,
    canContinue,
    
    // 유틸리티
    getEstimatedTimeRemaining,
    getCurrentPhaseInfo,
    
    // 상태 확인
    hasMoreComparisons: canContinue(),
    isComplete: reviewerStats.remaining === 0 || !canContinue(),
    
    // 알고리즘 재초기화 함수
    reinitialize: initializeAlgorithm
  };
};