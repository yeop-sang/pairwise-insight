import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ComparisonAlgorithm } from '@/utils/comparisonAlgorithm';
import { useTimeTracking } from './useTimeTracking';
import { useSessionMetadata } from './useSessionMetadata';
import { useQualityManager } from './useQualityManager';

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
  
  // Enhanced tracking hooks
  const { timeStamps, initializeShown, handleSubmission } = useTimeTracking();
  
  // Calculate number of responses for session metadata
  const numResponses = responses.length;
  
  const { sessionMetadata, isLoading: sessionLoading } = useSessionMetadata(
    projectId, 
    currentQuestion,
    numResponses
  );
  const { 
    reviewerStats: qualityStats, 
    processDecision, 
    initializeStats 
  } = useQualityManager({
    studentId: reviewerId,
    projectId,
    questionNumber: currentQuestion,
    config: sessionMetadata?.config || {
      shortResponseThresholdMs: 3000,
      consecutiveBiasThreshold: 5,
      mirrorReshowGap: 4,
      duplicateReevalGap: 10,
    }
  });
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
    remaining: sessionMetadata?.config.reviewerTargetPerPerson || 15,
    total: sessionMetadata?.config.reviewerTargetPerPerson || 15,
    progress: 0
  });
  
  // Update reviewer stats when session metadata changes
  useEffect(() => {
    if (sessionMetadata?.config.reviewerTargetPerPerson) {
      setReviewerStats(prev => ({
        ...prev,
        remaining: sessionMetadata.config.reviewerTargetPerPerson - prev.completed,
        total: sessionMetadata.config.reviewerTargetPerPerson,
        progress: (prev.completed / sessionMetadata.config.reviewerTargetPerPerson) * 100
      }));
    }
  }, [sessionMetadata?.config.reviewerTargetPerPerson]);

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

  useEffect(() => {
    if (reviewerId && projectId && currentQuestion) {
      initializeStats();
    }
  }, [reviewerId, projectId, currentQuestion, initializeStats]);

  // Initialize timing when new pair is loaded
  useEffect(() => {
    if (currentPair) {
      initializeShown();
    }
  }, [currentPair, initializeShown]);

  const submitComparison = useCallback(async (decision: 'A' | 'B' | 'N') => {
    if (!algorithm || !currentPair || !projectId || !reviewerId || !sessionMetadata) {
      console.error("Missing required data for comparison submission", {
        hasAlgorithm: !!algorithm,
        hasCurrentPair: !!currentPair,
        projectId,
        reviewerId,
        hasSessionMetadata: !!sessionMetadata,
        sessionLoading
      });
      return false;
    }

    try {
      // Handle submission timing
      const submissionTimeData = handleSubmission();
      
      // Map decision to database format
      const dbDecision = decision === 'A' ? 'left' : decision === 'B' ? 'right' : 'neutral';
      const decisionTimeMs = timeStamps.comparisonTimeMs || 0;
      
      console.log(`Submitting comparison: ${currentPair.responseA.student_code} vs ${currentPair.responseB.student_code}, decision: ${decision}, time: ${decisionTimeMs}ms`);
      
      // Process decision with quality manager
      const qualityResult = await processDecision(dbDecision as 'left' | 'right' | 'neutral', decisionTimeMs);
      
      // Generate decision ID for duplicate prevention
      const decisionId = crypto.randomUUID();
      
      // Prepare comparison data with enhanced tracking
      const comparisonData = {
        decision_id: decisionId,
        project_id: projectId,
        response_a_id: currentPair.responseA.id,
        response_b_id: currentPair.responseB.id,
        decision: dbDecision,
        student_id: reviewerId,
        question_number: currentPair.responseA.question_number,
        comparison_time_ms: decisionTimeMs,
        shown_at_client: timeStamps.shownAtClient.toISOString(),
        shown_at_server: new Date().toISOString(),
        submitted_at_client: timeStamps.submittedAtClient?.toISOString() || new Date().toISOString(),
        submitted_at_server: new Date().toISOString(),
        ui_order_left_id: currentPair.responseA.id,
        ui_order_right_id: currentPair.responseB.id,
        weight_applied: qualityStats?.finalWeightApplied || 1.0,
        popup_shown: qualityResult?.popupInfo?.popupShown || false,
        popup_reason: qualityResult?.popupInfo?.popupReason,
        is_mirror: false,
        is_duplicate_reeval: false,
      };

      // Insert comparison into database
      const { error } = await supabase
        .from('comparisons')
        .insert([comparisonData]);

      if (error) {
        console.error("Error saving comparison:", error);
        if (error.code === '42501') {
          throw new Error('비교 저장 권한이 없습니다. 로그인 상태를 확인해주세요.');
        }
        throw new Error('비교 저장 중 오류가 발생했습니다.');
      }

      // Update algorithm state
      algorithm.processComparison(
        reviewerId,
        currentPair.responseA.id,
        currentPair.responseB.id,
        dbDecision
      );

      // Handle mirror reshow if needed
      if (qualityResult?.shouldMirror) {
        // Schedule mirror reshow (implementation would go here)
        console.log(`Mirror reshow triggered for bias pattern: ${qualityResult.mirrorType}`);
      }

      // Get next pair and initialize timing for next comparison
      const nextPair = algorithm.getNextComparison(reviewerId);
      setCurrentPair(nextPair);
      if (nextPair) {
        initializeShown();
      }
      
      // Update stats
      updateStats(algorithm);

      return true;
    } catch (error) {
      console.error("Error in submitComparison:", error);
      return false;
    }
  }, [algorithm, currentPair, projectId, reviewerId, sessionMetadata, handleSubmission, timeStamps, processDecision, qualityStats, updateStats, initializeShown]);

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
    qualityStats,
    sessionMetadata,
    
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
    reinitialize: initializeAlgorithm,
    
    // Enhanced features
    timeStamps,
    initializeShown
  };
};