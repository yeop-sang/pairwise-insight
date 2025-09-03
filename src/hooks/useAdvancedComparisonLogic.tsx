import { useState, useEffect, useCallback, useRef } from 'react';
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
  reviewerId: string; // 현재 리뷰어 ID (학생 ID)
}

export const useAdvancedComparisonLogic = ({ 
  projectId, 
  responses, 
  reviewerId 
}: UseAdvancedComparisonLogicProps) => {
  const [currentPair, setCurrentPair] = useState<ComparisonPair | null>(null);
  const [algorithm, setAlgorithm] = useState<ComparisonAlgorithm | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
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

  const algorithmRef = useRef<ComparisonAlgorithm | null>(null);

  // 자기 응답 제외 함수
  const isOwnResponse = useCallback(async (response: StudentResponse, studentId: string) => {
    try {
      // 학생 ID를 통해 student_code 조회
      const { data: student, error } = await supabase
        .from('students')
        .select('student_id')
        .eq('id', studentId)
        .single();

      if (error || !student) return false;
      
      // 응답의 student_code와 학생의 student_id가 일치하는지 확인
      return response.student_code === student.student_id;
    } catch (error) {
      console.error('Error checking own response:', error);
      return false;
    }
  }, []);

  const initializeAlgorithm = useCallback(async () => {
    if (!projectId || responses.length === 0 || !reviewerId) return;

    try {
      // 프로젝트에 할당된 학생들의 ID 가져오기
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('student_id')
        .eq('project_id', projectId);

      if (assignmentsError) throw assignmentsError;

      const reviewerIds = assignments?.map(a => a.student_id) || [reviewerId];
      
      // 자기 응답 제외하여 필터링
      const filteredResponses = [];
      for (const response of responses) {
        const isOwn = await isOwnResponse(response, reviewerId);
        if (!isOwn) {
          filteredResponses.push(response);
        }
      }
      
      // 알고리즘 인스턴스 생성
      const newAlgorithm = new ComparisonAlgorithm(filteredResponses, reviewerIds);
      await newAlgorithm.initializeWithExistingComparisons(projectId, supabase);
      
      setAlgorithm(newAlgorithm);
      algorithmRef.current = newAlgorithm;
      
      // 초기 페어 로드
      const nextPair = newAlgorithm.getNextComparison(reviewerId);
      setCurrentPair(nextPair);
      
      // 통계 업데이트
      updateStats(newAlgorithm);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing comparison algorithm:', error);
    }
  }, [projectId, responses, reviewerId, isOwnResponse]);

  const updateStats = useCallback((alg: ComparisonAlgorithm) => {
    const completion = alg.getCompletionStats();
    const reviewer = alg.getReviewerStats(reviewerId);
    
    setCompletionStats(completion);
    if (reviewer) {
      setReviewerStats(reviewer);
    }
  }, [reviewerId]);

  useEffect(() => {
    // 응답이 변경될 때마다 알고리즘을 재초기화
    setIsInitialized(false);
    setCurrentPair(null);
    setAlgorithm(null);
    algorithmRef.current = null;
    
    initializeAlgorithm();
  }, [initializeAlgorithm]);

  const submitComparison = useCallback(async (
    decision: 'left' | 'right' | 'neutral',
    comparisonTimeMs: number
  ) => {
    if (!algorithm || !currentPair) return false;

    try {
      // 데이터베이스에 비교 결과 저장
      const { error } = await supabase
        .from('comparisons')
        .insert({
          project_id: projectId,
          student_id: reviewerId,
          response_a_id: currentPair.responseA.id,
          response_b_id: currentPair.responseB.id,
          decision: decision,
          comparison_time_ms: comparisonTimeMs
        });

      if (error) throw error;

      // 알고리즘 상태 업데이트
      algorithm.processComparison(
        reviewerId,
        currentPair.responseA.id,
        currentPair.responseB.id,
        decision
      );

      // 다음 페어 로드
      const nextPair = algorithm.getNextComparison(reviewerId);
      setCurrentPair(nextPair);

      // 통계 업데이트
      updateStats(algorithm);

      return true;
    } catch (error) {
      console.error('Error submitting comparison:', error);
      return false;
    }
  }, [algorithm, currentPair, projectId, reviewerId, updateStats]);

  const canContinue = useCallback(() => {
    if (!algorithm) return false;
    return algorithm.canReviewerContinue(reviewerId);
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
    isInitialized,
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