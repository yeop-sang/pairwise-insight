import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Clock, ChevronLeft, ChevronRight, Minus, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAdvancedComparisonLogic } from "@/hooks/useAdvancedComparisonLogic";
import { Progress } from "@/components/ui/progress";
import { RubricDisplay } from "@/components/RubricDisplay";
import { ExperienceFeedbackModal } from "@/components/ExperienceFeedbackModal";
import { SelfEvaluationStep } from "@/components/SelfEvaluationStep";
import { CognitiveLoadModal } from "@/components/CognitiveLoadModal";

interface StudentResponse {
  id: string;
  response_text: string;
  question_number: number;
}

interface Project {
  id: string;
  title: string;
  question: string;
  rubric: string;
}

interface SelfEvaluation {
  question_number: number;
  score: number;
  reason: string;
}

// 세션 단계 타입
type SessionPhase = 'loading' | 'pre_evaluation' | 'comparing' | 'post_evaluation' | 'completed';

export const ComparisonSession = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { student } = useStudentAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [allResponses, setAllResponses] = useState<StudentResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [maxQuestions, setMaxQuestions] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  
  // 응답 로딩 완료 상태 추적
  const [responsesLoaded, setResponsesLoaded] = useState(false);

  // 자기평가 관련 상태
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('loading');
  const [preEvaluationQuestion, setPreEvaluationQuestion] = useState<number>(1);
  const [postEvaluationQuestion, setPostEvaluationQuestion] = useState<number>(1);
  const [myResponses, setMyResponses] = useState<Record<number, string>>({});
  const [preEvaluations, setPreEvaluations] = useState<SelfEvaluation[]>([]);
  
  // 인지부하 데이터 로딩 완료 플래그 (레이스 컨디션 방지)
  const [cognitiveLoadLoaded, setCognitiveLoadLoaded] = useState(false);

  // 현재 사용자 정보 (교사 또는 학생)  
  const isStudent = !!student;
  const isTeacher = !!user && !!profile;
  const currentUserId = student?.id || user?.id;

  // 현재 문항의 응답 개수를 계산 (응답 로딩 완료 후에만 유효한 값 반환)
  const currentQuestionResponseCount = useMemo(() => {
    if (!responsesLoaded) return 0;
    const count = allResponses.filter(r => r.question_number === currentQuestion).length;
    console.log(`Question ${currentQuestion}: ${count} responses (loaded: ${responsesLoaded})`);
    return count;
  }, [allResponses, currentQuestion, responsesLoaded]);

  // 고급 비교 알고리즘 훅 사용
  const {
    currentPair,
    isInitializing,
    completionStats,
    reviewerStats,
    submitComparison,
    canContinue,
    getEstimatedTimeRemaining,
    getCurrentPhaseInfo,
    hasMoreComparisons,
    isComplete,
    reinitialize,
    sessionMetadata
  } = useAdvancedComparisonLogic({
    projectId: projectId || '',
    responses,
    reviewerId: student?.student_number?.toString() || user?.id || '',
    currentQuestion,
    // 응답 로딩 완료 후에만 유효한 응답 수 전달
    numResponses: responsesLoaded && currentQuestionResponseCount > 0 ? currentQuestionResponseCount : undefined,
    studentUUID: student?.id // Pass UUID for database operations
  });

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (submitting || !currentPair || !isStudent) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handleChoice('left');
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleChoice('neutral');
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleChoice('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [submitting, currentPair, isStudent]);

  useEffect(() => {
    if (!isStudent && !isTeacher) {
      navigate('/student-login');
      return;
    }
    
    if (projectId) {
      console.log("ComparisonSession - Current user:", {
        isStudent,
        studentId: student?.id,
        studentCode: student?.student_id,
        isTeacher,
        userId: user?.id
      });
      fetchProjectAndResponses();
    }
  }, [isStudent, isTeacher, projectId, navigate]);

  // 학생 정보로 student_code 생성 (학년 + 반(2자리) + 번호(2자리))
  const generateStudentCode = (studentData: typeof student): string => {
    if (!studentData) return '';
    const grade = studentData.grade || 1;
    const classNum = (studentData.class_number || 1).toString().padStart(2, '0');
    const number = (studentData.student_number || 1).toString().padStart(2, '0');
    return `${grade}${classNum}${number}`;
  };

  // 학생의 자기 응답 조회
  const fetchMyResponses = async () => {
    if (!student || !projectId) return;

    const studentCode = generateStudentCode(student);
    console.log('Generated student_code for matching:', studentCode);

    try {
      // student_code로 매칭하여 내 응답 조회
      const { data, error } = await supabase
        .from('student_responses')
        .select('question_number, response_text')
        .eq('project_id', projectId)
        .eq('student_code', studentCode);

      if (error) throw error;

      if (data) {
        const responseMap: Record<number, string> = {};
        data.forEach(r => {
          responseMap[r.question_number] = r.response_text;
        });
        setMyResponses(responseMap);
        console.log('My responses loaded:', responseMap);
      }
    } catch (error) {
      console.error('Error fetching my responses:', error);
    }
  };

  // 기존 자기평가 조회
  const fetchPreEvaluations = async () => {
    if (!student || !projectId) return;

    try {
      const { data, error } = await supabase
        .from('self_evaluations' as any)
        .select('question_number, score, reason')
        .eq('project_id', projectId)
        .eq('student_id', student.id)
        .eq('phase', 'pre');

      if (error) throw error;

      if (data && data.length > 0) {
        setPreEvaluations(data as unknown as SelfEvaluation[]);
        console.log('Pre-evaluations loaded:', data);
      }
    } catch (error) {
      console.error('Error fetching pre-evaluations:', error);
    }
  };

  // 프로젝트 로딩 후 자기 응답 조회 및 세션 단계 결정
  useEffect(() => {
    const initializeSession = async () => {
      if (!project || !student || !responsesLoaded || maxQuestions === 0) return;

      await fetchMyResponses();
      await fetchPreEvaluations();

      // 기존 인지부하 측정 기록 조회 (이미 완료된 것들 확인)
      const { data: cognitiveLoadData, error: cogLoadError } = await supabase
        .from('cognitive_load_measurements' as any)
        .select('question_number, phase')
        .eq('project_id', projectId)
        .eq('student_id', student.id);

      // 비교평가 단계에서 완료된 문항들 세팅
      const completedCognitiveLoadQuestions = new Set<number>();
      const hasInitialSelfEvalCogLoad = cognitiveLoadData?.some((r: any) => r.phase === 'initial_self_eval') || false;
      const hasFinalSelfEvalCogLoad = cognitiveLoadData?.some((r: any) => r.phase === 'final_self_eval') || false;
      
      if (!cogLoadError && cognitiveLoadData) {
        cognitiveLoadData.forEach((record: any) => {
          if (record.phase === 'comparison' && record.question_number) {
            completedCognitiveLoadQuestions.add(record.question_number);
          }
        });
        console.log('Previously completed cognitive load measurements:', {
          comparison: Array.from(completedCognitiveLoadQuestions),
          hasInitialSelfEval: hasInitialSelfEvalCogLoad,
          hasFinalSelfEval: hasFinalSelfEvalCogLoad
        });
      }
      setCognitiveLoadShownForQuestions(completedCognitiveLoadQuestions);
      setCognitiveLoadLoaded(true); // 인지부하 데이터 로드 완료 플래그

      // 문항별 비교 완료 개수 조회
      const questionCompletionCounts: Record<number, number> = {};
      for (let q = 1; q <= maxQuestions; q++) {
        const { data: compData, error: compError } = await supabase
          .from('comparisons')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .eq('student_id', student.id)
          .eq('question_number', q);
        
        if (!compError && compData) {
          questionCompletionCounts[q] = compData.length;
        }
      }
      console.log('Question completion counts:', questionCompletionCounts);

      // 사전 자기평가가 모두 완료되었는지 확인
      const { data: preEvalData, error } = await supabase
        .from('self_evaluations' as any)
        .select('question_number')
        .eq('project_id', projectId)
        .eq('student_id', student.id)
        .eq('phase', 'pre');

      if (error) {
        console.error('Error checking pre-evaluations:', error);
        setSessionPhase('pre_evaluation');
        return;
      }

      const completedPreEvals = new Set((preEvalData || []).map((e: any) => e.question_number));
      
      // 모든 문항의 사전 평가가 완료되었는지 확인
      let allPreEvalsComplete = true;
      for (let q = 1; q <= maxQuestions; q++) {
        if (!completedPreEvals.has(q)) {
          allPreEvalsComplete = false;
          setPreEvaluationQuestion(q);
          break;
        }
      }

      if (!allPreEvalsComplete) {
        setSessionPhase('pre_evaluation');
        return;
      }

      // 사전 자기평가 인지부하 체크
      if (!hasInitialSelfEvalCogLoad) {
        setCognitiveLoadPhase('initial_self_eval');
        setCognitiveLoadQuestionNumber(null);
        setPendingPhaseTransition(() => () => setSessionPhase('comparing'));
        setShowCognitiveLoadModal(true);
        return;
      }

      // 비교 단계: 첫 미완료 문항 찾기
      const requiredPerQuestion = sessionMetadata?.config.reviewerTargetPerPerson || 15;
      let firstIncompleteQuestion = 0;
      
      for (let q = 1; q <= maxQuestions; q++) {
        const count = questionCompletionCounts[q] || 0;
        if (count < requiredPerQuestion) {
          firstIncompleteQuestion = q;
          break;
        }
      }

      // 모든 문항 비교 완료 체크
      if (firstIncompleteQuestion === 0) {
        // 마지막 문항 인지부하 체크
        if (!completedCognitiveLoadQuestions.has(maxQuestions)) {
          setCognitiveLoadPhase('comparison');
          setCognitiveLoadQuestionNumber(maxQuestions);
          setPendingPhaseTransition(() => () => {
            setCognitiveLoadShownForQuestions(prev => new Set(prev).add(maxQuestions));
            setPostEvaluationQuestion(1);
            setSessionPhase('post_evaluation');
          });
          setShowCognitiveLoadModal(true);
          setSessionPhase('comparing');
          return;
        }
        
        // 사후 자기평가 단계로 전환
        // 사후 자기평가 완료 여부 확인
        const { data: postEvalData } = await supabase
          .from('self_evaluations' as any)
          .select('question_number')
          .eq('project_id', projectId)
          .eq('student_id', student.id)
          .eq('phase', 'post');
        
        const completedPostEvals = new Set((postEvalData || []).map((e: any) => e.question_number));
        let firstIncompletePostEval = 0;
        for (let q = 1; q <= maxQuestions; q++) {
          if (!completedPostEvals.has(q)) {
            firstIncompletePostEval = q;
            break;
          }
        }
        
        if (firstIncompletePostEval > 0) {
          setPostEvaluationQuestion(firstIncompletePostEval);
          setSessionPhase('post_evaluation');
          return;
        }
        
        // 최종 인지부하 체크
        if (!hasFinalSelfEvalCogLoad) {
          setCognitiveLoadPhase('final_self_eval');
          setCognitiveLoadQuestionNumber(null);
          setPendingPhaseTransition(() => () => setSessionPhase('completed'));
          setShowCognitiveLoadModal(true);
          setSessionPhase('post_evaluation');
          return;
        }
        
        // 모든 것이 완료됨
        setSessionPhase('completed');
        return;
      }

      // 미완료 문항으로 이동하여 비교 시작
      // 해당 문항 이전 문항들의 인지부하 확인 및 스킵
      for (let q = 1; q < firstIncompleteQuestion; q++) {
        if (!completedCognitiveLoadQuestions.has(q)) {
          // 이전 문항의 인지부하가 누락된 경우 (비정상 상태이지만 처리)
          completedCognitiveLoadQuestions.add(q);
        }
      }
      setCognitiveLoadShownForQuestions(completedCognitiveLoadQuestions);
      
      setCurrentQuestion(firstIncompleteQuestion);
      setSessionPhase('comparing');
    };

    initializeSession();
  }, [project, student, responsesLoaded, maxQuestions, sessionMetadata?.config.reviewerTargetPerPerson]);

  // 문항별 응답 업데이트 및 알고리즘 재초기화
  useEffect(() => {
    if (allResponses.length > 0) {
      const currentQuestionResponses = allResponses.filter(r => r.question_number === currentQuestion);
      setResponses(currentQuestionResponses);
      
      // 문항이 변경되면 reviewerStats를 리셋
      if (currentQuestionResponses.length > 0) {
        console.log(`Moving to question ${currentQuestion}, reinitializing algorithm`);
      }
    }
  }, [currentQuestion, allResponses]);

  // 문항별 비교 완료 횟수를 캐싱하는 state (문항 번호 → 완료 횟수)
  // undefined: 아직 로드 안됨, 숫자: 로드된 완료 횟수
  const [actualCountsByQuestion, setActualCountsByQuestion] = useState<Record<number, number>>({});
  
  // 중복 완료 처리 방지를 위한 ref
  const completionHandledRef = useRef<number | null>(null);

  // 현재 문항의 완료 횟수 파생 (렌더 단계에서 즉시 판별 가능)
  const actualCompletedCount = actualCountsByQuestion[currentQuestion] ?? 0;
  const actualCountLoadedForCurrent = actualCountsByQuestion[currentQuestion] !== undefined;

  // 데이터베이스에서 실제 완료된 비교 횟수 조회
  useEffect(() => {
    const fetchActualCompletedCount = async () => {
      if (!student?.id || !projectId) return;

      const { data, error } = await supabase
        .from('comparisons')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('student_id', student.id)
        .eq('question_number', currentQuestion);

      if (!error && data) {
        const count = data.length;
        setActualCountsByQuestion(prev => ({
          ...prev,
          [currentQuestion]: count
        }));
        console.log(`Question ${currentQuestion}: ${count} comparisons completed in DB (loaded)`);
      }
    };

    fetchActualCompletedCount();
  }, [student?.id, projectId, currentQuestion, reviewerStats?.completed]); // reviewerStats가 변경될 때마다 재조회

  // Check if current question is complete (dynamic based on session metadata)
  const requiredComparisonsForQuestion = sessionMetadata?.config.reviewerTargetPerPerson || 15;
  // Complete if target reached OR no more pairs available
  // IMPORTANT: actualCountLoadedForCurrent가 true일 때만 완료 판정 (문항 변경 시 오판 방지)
  const isCurrentQuestionComplete = actualCountLoadedForCurrent && (
    actualCompletedCount >= requiredComparisonsForQuestion || 
    (!currentPair && !isInitializing && actualCompletedCount > 0)
  );
  
  // 완료 여부 추적
  const [hasUpdatedCompletion, setHasUpdatedCompletion] = useState(false);
  
  // 피드백 모달 상태
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // 인지부하 측정 모달 상태
  const [showCognitiveLoadModal, setShowCognitiveLoadModal] = useState(false);
  const [cognitiveLoadPhase, setCognitiveLoadPhase] = useState<'initial_self_eval' | 'comparison' | 'final_self_eval'>('initial_self_eval');
  const [cognitiveLoadQuestionNumber, setCognitiveLoadQuestionNumber] = useState<number | null>(null);
  const [pendingPhaseTransition, setPendingPhaseTransition] = useState<(() => void) | null>(null);
  const [cognitiveLoadShownForQuestions, setCognitiveLoadShownForQuestions] = useState<Set<number>>(new Set());

  // 참고: 문항 완료 시 인지부하 모달 처리는 아래 통합 Effect에서 담당

  // 모든 문항별로 실제 완료된 비교 횟수 확인
  const [allQuestionsCompletedCounts, setAllQuestionsCompletedCounts] = useState<Record<number, number>>({});

  // 모든 문항의 완료 상태 확인
  useEffect(() => {
    const fetchAllQuestionsCounts = async () => {
      if (!student?.id || !projectId || maxQuestions === 0) return;

      const counts: Record<number, number> = {};
      
      for (let q = 1; q <= maxQuestions; q++) {
        const { data, error } = await supabase
          .from('comparisons')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .eq('student_id', student.id)
          .eq('question_number', q);

        if (!error && data) {
          counts[q] = data.length;
        }
      }
      
      setAllQuestionsCompletedCounts(counts);
    };

    fetchAllQuestionsCounts();
  }, [student?.id, projectId, maxQuestions, reviewerStats?.completed]);

  // 모든 문항이 완료되었는지 확인
  const allQuestionsComplete = useMemo(() => {
    if (maxQuestions === 0) return false;
    
    // 각 문항별로 필요한 비교 횟수가 완료되었는지 확인
    for (let q = 1; q <= maxQuestions; q++) {
      const count = allQuestionsCompletedCounts[q] || 0;
      if (count < requiredComparisonsForQuestion) {
        return false;
      }
    }
    
    return true;
  }, [maxQuestions, allQuestionsCompletedCounts, requiredComparisonsForQuestion]);
  
  // Debug logging with render conditions
  console.log('Debug - Render conditions check:', {
    currentQuestion,
    maxQuestions,
    allQuestionsComplete,
    allQuestionsCompletedCounts,
    isCurrentQuestionComplete,
    reviewerStatsCompleted: reviewerStats?.completed,
    actualCompletedCount,
    requiredComparisonsForQuestion,
    currentPair: !!currentPair,
    isInitializing,
    loading,
    project: !!project,
    hasUpdatedCompletion
  });

  // 프로젝트 할당 완료 상태 업데이트
  const updateProjectAssignmentCompletion = useCallback(async () => {
    if (!student?.id || !projectId) {
      console.log('Missing required data for completion update:', { studentId: student?.id, projectId });
      return;
    }

    // 이미 업데이트했으면 중복 실행 방지
    if (hasUpdatedCompletion) {
      console.log('Completion already updated, skipping...');
      return;
    }

    try {
      console.log('Checking current assignment status before update...');
      
      // 먼저 현재 상태 확인
      const { data: currentAssignment, error: checkError } = await supabase
        .from('project_assignments')
        .select('has_completed, completed_at')
        .eq('project_id', projectId)
        .eq('student_id', student.id)
        .single();

      if (checkError) {
        console.error('Error checking assignment status:', checkError);
        return;
      }

      // 이미 완료 상태라면 업데이트하지 않음
      if (currentAssignment?.has_completed) {
        console.log('Assignment already completed, skipping update');
        setHasUpdatedCompletion(true);
        return;
      }

      console.log('Updating project assignment completion for:', { 
        studentId: student.id, 
        projectId,
        allQuestionsCompletedCounts 
      });
      
      const { error } = await supabase
        .from('project_assignments')
        .update({
          has_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('student_id', student.id);

      if (error) {
        console.error('Error updating project assignment completion:', error);
        toast({
          title: "오류",
          description: "완료 상태 업데이트 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } else {
        console.log('Project assignment completion updated successfully');
        setHasUpdatedCompletion(true);
        // 완료 후 피드백 모달 표시
        setShowFeedbackModal(true);
        toast({
          title: "완료",
          description: "모든 문항의 비교를 완료했습니다!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error updating project assignment:', error);
      toast({
        title: "오류", 
        description: "완료 상태 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [student?.id, projectId, hasUpdatedCompletion, allQuestionsCompletedCounts, toast]);

  // 마지막 문항 완료 시 또는 현재 문항 완료 후 인지부하 모달 표시 (통합 Effect)
  // 조건: comparing 단계에서 현재 문항이 완료되었고, 인지부하 데이터가 로드되었으며, 모달이 아직 표시 중이 아닌 경우
  useEffect(() => {
    if (!cognitiveLoadLoaded) return;
    if (!actualCountLoadedForCurrent) return; // 현재 문항의 비교 횟수가 로드될 때까지 대기
    if (sessionPhase !== 'comparing') return;
    if (showCognitiveLoadModal) return;
    if (!isStudent) return;
    
    // 현재 문항이 완료되었는지 확인 (마지막 문항 포함)
    const isComplete = isCurrentQuestionComplete || (allQuestionsComplete && currentQuestion === maxQuestions);
    
    if (!isComplete) return;
    
    // 이미 이 문항의 완료 처리를 시작했다면 중복 실행 방지
    if (completionHandledRef.current === currentQuestion && !cognitiveLoadShownForQuestions.has(currentQuestion)) {
      console.log(`Question ${currentQuestion} completion already being handled, skipping.`);
      return;
    }
    
    // 인지부하가 아직 표시되지 않은 경우
    if (!cognitiveLoadShownForQuestions.has(currentQuestion)) {
      console.log(`Question ${currentQuestion} completed. Showing cognitive load modal.`);
      
      // 중복 처리 방지 플래그 설정
      completionHandledRef.current = currentQuestion;
      
      setCognitiveLoadPhase('comparison');
      setCognitiveLoadQuestionNumber(currentQuestion);
      
      // 다음 단계 결정: 마지막 문항이면 post_evaluation으로, 아니면 다음 문항으로
      if (currentQuestion >= maxQuestions) {
        setPendingPhaseTransition(() => () => {
          setCognitiveLoadShownForQuestions(prev => new Set(prev).add(currentQuestion));
          completionHandledRef.current = null; // 처리 완료 후 리셋
          setPostEvaluationQuestion(1);
          setSessionPhase('post_evaluation');
        });
      } else {
        setPendingPhaseTransition(() => () => {
          setCognitiveLoadShownForQuestions(prev => new Set(prev).add(currentQuestion));
          completionHandledRef.current = null; // 처리 완료 후 리셋
          setCurrentQuestion(prev => prev + 1);
        });
      }
      setShowCognitiveLoadModal(true);
    } else if (currentQuestion < maxQuestions) {
      // 인지부하가 이미 완료되어 있으면 자동으로 다음 문항으로 전환
      console.log(`Question ${currentQuestion} cognitive load already done. Auto-advancing to next question.`);
      setCurrentQuestion(prev => prev + 1);
    } else {
      // 마지막 문항이고 인지부하도 이미 완료됨 → post_evaluation으로 이동
      console.log(`Last question cognitive load already done. Moving to post_evaluation.`);
      setPostEvaluationQuestion(1);
      setSessionPhase('post_evaluation');
    }
  }, [
    cognitiveLoadLoaded,
    actualCountLoadedForCurrent,
    sessionPhase, 
    isCurrentQuestionComplete, 
    allQuestionsComplete,
    currentQuestion, 
    maxQuestions, 
    cognitiveLoadShownForQuestions, 
    showCognitiveLoadModal, 
    isStudent
  ]);

  // 사후 자기평가가 모두 완료되면 프로젝트 완료 처리
  useEffect(() => {
    if (sessionPhase === 'completed' && !hasUpdatedCompletion) {
      updateProjectAssignmentCompletion();
    }
  }, [sessionPhase, hasUpdatedCompletion, updateProjectAssignmentCompletion]);

  const fetchProjectAndResponses = async () => {
    try {
      console.log('Fetching project and responses for:', projectId);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, title, question, rubric')
        .eq('id', projectId)
        .eq('is_active', true)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw projectError;
      }
      
      console.log('Project data loaded:', projectData);
      setProject(projectData);

      // Fetch all responses for this project
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('id, response_text, question_number, project_id')
        .eq('project_id', projectId)
        .order('question_number');

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
        throw responsesError;
      }
      
      console.log('Responses loaded:', responsesData?.length, 'total responses');
      setAllResponses(responsesData || []);
      
      // 응답 로딩 완료 플래그 설정
      if (responsesData && responsesData.length > 0) {
        setResponsesLoaded(true);
      }
      
      // 최대 문항 수 계산
      const maxQuestionNumber = Math.max(...(responsesData || []).map(r => r.question_number));
      console.log('Max question number:', maxQuestionNumber);
      setMaxQuestions(maxQuestionNumber);
      
      // 첫 번째 문항의 응답들로 시작
      const firstQuestionResponses = (responsesData || []).filter(r => r.question_number === 1);
      console.log('First question responses:', firstQuestionResponses.length);
      setResponses(firstQuestionResponses);
      
    } catch (error: any) {
      console.error('Error in fetchProjectAndResponses:', error);
      toast({
        variant: "destructive",
        title: "프로젝트 로드 실패",
        description: error.message
      });
      navigate(isStudent ? '/student-dashboard' : '/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // loadNextComparison 함수는 새로운 알고리즘에서 자동으로 처리됨

  const handleChoice = async (decision: 'left' | 'right' | 'neutral') => {
    if (!currentPair || !currentUserId) return;
    
    // Only students can make comparisons, teachers can only view
    if (!isStudent) {
      toast({
        variant: "destructive",
        title: "권한 없음",
        description: "교사는 비교를 볼 수만 있습니다."
      });
      return;
    }

    setSubmitting(true);
    const comparisonTime = Date.now() - startTime;

    try {
      // 결정을 정확하게 매핑: left → A, right → B, neutral → N
      const mappedDecision = decision === 'left' ? 'A' : decision === 'right' ? 'B' : 'N';
      const success = await submitComparison(mappedDecision);
      
      if (success) {
        const decisionText = decision === 'left' ? '응답 A' : decision === 'right' ? '응답 B' : '중립';
        toast({
          title: "비교 완료",
          description: `${decisionText}를 선택했습니다.`
        });
        
        // 새로운 시작 시간 설정
        setStartTime(Date.now());
      } else {
        throw new Error('비교 저장에 실패했습니다.');
      }

    } catch (error: any) {
      console.error('Error in handleChoice:', error);
      toast({
        variant: "destructive",
        title: "비교 저장 실패",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 문항별 질문을 가져오는 함수
  const getQuestionByNumber = (questionNumber: number) => {
    if (!project?.question) return `문항 ${questionNumber}`;
    
    try {
      // Parse the questions JSON from the project
      const questionsData = JSON.parse(project.question);
      return questionsData[questionNumber] || `문항 ${questionNumber}`;
    } catch (error) {
      console.error("Failed to parse questions:", error);
      return project.question || `문항 ${questionNumber}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">프로젝트를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 사전 자기평가 단계
  if (sessionPhase === 'pre_evaluation' && isStudent && student) {
    const handlePreEvalComplete = async () => {
      if (preEvaluationQuestion < maxQuestions) {
        setPreEvaluationQuestion(prev => prev + 1);
      } else {
        // 모든 사전 평가 완료 → 인지부하 측정 후 비교 시작
        await fetchPreEvaluations();
        setCognitiveLoadPhase('initial_self_eval');
        setCognitiveLoadQuestionNumber(null);
        setPendingPhaseTransition(() => () => setSessionPhase('comparing'));
        setShowCognitiveLoadModal(true);
      }
    };

    return (
      <>
        <SelfEvaluationStep
          projectId={projectId || ''}
          studentId={student.id}
          questionNumber={preEvaluationQuestion}
          totalQuestions={maxQuestions}
          phase="pre"
          myResponse={myResponses[preEvaluationQuestion] || ''}
          questionText={getQuestionByNumber(preEvaluationQuestion)}
          onComplete={handlePreEvalComplete}
        />
        
        {/* 인지부하 측정 모달 */}
        <CognitiveLoadModal
          isOpen={showCognitiveLoadModal}
          onClose={() => {}}
          projectId={projectId || ''}
          studentId={student.id}
          questionNumber={cognitiveLoadQuestionNumber}
          phase={cognitiveLoadPhase}
          onSubmitSuccess={() => {
            setShowCognitiveLoadModal(false);
            if (pendingPhaseTransition) {
              pendingPhaseTransition();
              setPendingPhaseTransition(null);
            }
          }}
        />
      </>
    );
  }

  if (sessionPhase === 'post_evaluation' && isStudent && student) {
    const preEval = preEvaluations.find(e => e.question_number === postEvaluationQuestion);
    
    const handlePostEvalComplete = () => {
      if (postEvaluationQuestion < maxQuestions) {
        setPostEvaluationQuestion(prev => prev + 1);
      } else {
        // 모든 사후 평가 완료 → 인지부하 측정 후 완료 화면
        setCognitiveLoadPhase('final_self_eval');
        setCognitiveLoadQuestionNumber(null);
        setPendingPhaseTransition(() => () => setSessionPhase('completed'));
        setShowCognitiveLoadModal(true);
      }
    };

    return (
      <>
        <SelfEvaluationStep
          projectId={projectId || ''}
          studentId={student.id}
          questionNumber={postEvaluationQuestion}
          totalQuestions={maxQuestions}
          phase="post"
          myResponse={myResponses[postEvaluationQuestion] || ''}
          questionText={getQuestionByNumber(postEvaluationQuestion)}
          preScore={preEval?.score}
          preReason={preEval?.reason}
          onComplete={handlePostEvalComplete}
        />
        
        {/* 인지부하 측정 모달 */}
        <CognitiveLoadModal
          isOpen={showCognitiveLoadModal}
          onClose={() => {}}
          projectId={projectId || ''}
          studentId={student.id}
          questionNumber={cognitiveLoadQuestionNumber}
          phase={cognitiveLoadPhase}
          onSubmitSuccess={() => {
            setShowCognitiveLoadModal(false);
            if (pendingPhaseTransition) {
              pendingPhaseTransition();
              setPendingPhaseTransition(null);
            }
          }}
        />
      </>
    );
  }

  // 완료 단계
  if (sessionPhase === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-2xl mx-auto">
          <div className="h-20 w-20 text-green-500 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center text-3xl">
            🎉
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">모든 평가 완료!</h2>
          <p className="text-lg text-muted-foreground mb-6">
            자기평가와 동료 비교평가를 모두 완료하셨습니다.<br/>
            참여해주셔서 감사합니다.
          </p>
          <div className="bg-muted/50 p-6 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              총 <span className="font-semibold text-foreground">{reviewerStats?.completed || 0}개</span>의 비교를 완료했습니다
            </p>
            <p className="text-sm text-muted-foreground">
              여러분의 소중한 피드백이 동료들의 학습에 큰 도움이 됩니다
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => navigate('/student-dashboard')}
            className="min-w-48"
          >
            학생 대시보드로 돌아가기
          </Button>
        </Card>
        
        {/* 피드백 모달 */}
        {student && (
          <ExperienceFeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            projectId={projectId || ''}
            studentId={student.id}
            onSubmitSuccess={() => setShowFeedbackModal(false)}
          />
        )}
      </div>
    );
  }

  // Note: allQuestionsComplete early return 제거됨 - 대신 통합 Effect에서 post_evaluation으로 전환

  // Priority 2 제거됨 - 인지부하 완료된 문항은 자동으로 다음으로 넘어감

  // 비교 쌍이 없고 초기화 중이 아닌 경우
  // 인지부하 모달이 필요한 경우 모달과 함께 대기 메시지 표시
  if (!currentPair && !isInitializing) {
    // 현재 문항의 데이터가 아직 로드되지 않았으면 로딩 표시
    if (!actualCountLoadedForCurrent) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">비교 데이터를 불러오는 중...</p>
          </div>
        </div>
      );
    }
    
    // 문항 완료 후 인지부하 측정 대기 중인 경우
    if (isCurrentQuestionComplete && !cognitiveLoadShownForQuestions.has(currentQuestion) && student) {
      return (
        <>
          <div className="container mx-auto px-4 py-8">
            <Card className="p-8 text-center">
              <div className="h-16 w-16 text-green-500 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                ✓
              </div>
              <h2 className="text-2xl font-bold mb-4">문항 {currentQuestion} 완료!</h2>
              <p className="text-muted-foreground mb-4">
                인지부하 측정을 진행해주세요.
              </p>
            </Card>
          </div>
          
          {/* 인지부하 측정 모달 */}
          <CognitiveLoadModal
            isOpen={showCognitiveLoadModal}
            onClose={() => {}}
            projectId={projectId || ''}
            studentId={student.id}
            questionNumber={cognitiveLoadQuestionNumber}
            phase={cognitiveLoadPhase}
            onSubmitSuccess={() => {
              setShowCognitiveLoadModal(false);
              if (pendingPhaseTransition) {
                pendingPhaseTransition();
                setPendingPhaseTransition(null);
              }
            }}
          />
        </>
      );
    }
    
    // 인지부하도 완료되었는데 화면 전환 대기 중인 경우
    if (isCurrentQuestionComplete && cognitiveLoadShownForQuestions.has(currentQuestion)) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>다음 단계로 이동 중...</span>
            </div>
          </Card>
        </div>
      );
    }
    
    // 일반적인 완료 케이스 (교사 등)
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-2xl mx-auto">
          <div className="h-20 w-20 text-green-500 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center text-3xl">
            ✓
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">평가를 완료했습니다!</h2>
          <p className="text-lg text-muted-foreground mb-6">
            {currentQuestion}번 문항의 비교를 모두 완료했습니다.<br/>
            동료 평가에 참여해주셔서 감사합니다.
          </p>
          <div className="bg-muted/50 p-6 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              총 <span className="font-semibold text-foreground">{reviewerStats?.completed || 0}개</span>의 비교를 완료했습니다
            </p>
            <p className="text-sm text-muted-foreground">
              여러분의 소중한 피드백이 동료들의 학습에 큰 도움이 됩니다
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => navigate('/student-dashboard')}
            className="min-w-48"
          >
            학생 대시보드로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  // 초기화 중일 때
  if (!currentPair) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">비교 쌍을 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  const phaseInfo = getCurrentPhaseInfo();
  const estimatedTime = getEstimatedTimeRemaining();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(isStudent ? "/student-dashboard" : "/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isStudent ? "학생 대시보드로 돌아가기" : "대시보드로 돌아가기"}
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
            <p className="text-muted-foreground mt-2">
              {currentQuestion}번 문항 ({currentQuestion}/{maxQuestions}) - 다음 두 응답을 비교하여 더 좋은 응답을 선택하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {reviewerStats.completed}/{requiredComparisonsForQuestion} 완료
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{currentQuestion}번 문항 평가</span>
            <Badge variant="secondary">{currentQuestion}/{maxQuestions}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-4">
            {getQuestionByNumber(currentQuestion)}
          </p>
          {project.rubric && (() => {
            try {
              const rubrics = JSON.parse(project.rubric);
              const currentRubric = rubrics[currentQuestion];
              if (currentRubric) {
                return (
                  <RubricDisplay 
                    questionNumber={currentQuestion} 
                    rubric={currentRubric} 
                  />
                );
              }
            } catch (error) {
              console.error('Failed to parse rubric:', error);
            }
            return null;
          })()}
          
          {/* 진행 상황 표시 */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">개인 진행률</span>
              <span className="font-medium">{reviewerStats.progress}%</span>
            </div>
            <Progress value={reviewerStats.progress} className="h-2" />
            
            {estimatedTime && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>예상 남은 시간</span>
                <span>{estimatedTime}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle>
              <span>응답 A</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {currentPair.responseA.response_text}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle>
              <span>응답 B</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {currentPair.responseB.response_text}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비교 선택 버튼들 */}
      <div className="mt-8 flex justify-center gap-4">
        <Button 
          size="lg"
          variant="outline"
          onClick={() => handleChoice('left')}
          disabled={submitting || !isStudent}
          className="min-w-32 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          응답 A 선택
          <span className="text-xs text-muted-foreground ml-2">(←)</span>
        </Button>

        <Button 
          size="lg"
          variant="secondary"
          onClick={() => handleChoice('neutral')}
          disabled={submitting || !isStudent}
          className="min-w-32 flex items-center gap-2"
        >
          <Minus className="h-4 w-4" />
          중립
          <span className="text-xs text-muted-foreground ml-2">(↓)</span>
        </Button>

        <Button 
          size="lg"
          variant="outline"
          onClick={() => handleChoice('right')}
          disabled={submitting || !isStudent}
          className="min-w-32 flex items-center gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          응답 B 선택
          <span className="text-xs text-muted-foreground ml-2">(→)</span>
        </Button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          신중하게 비교한 후 더 우수한 응답을 선택해주세요
        </p>
      </div>

      {/* 인지부하 측정 모달 - 비교평가 중 */}
      {student && (
        <CognitiveLoadModal
          isOpen={showCognitiveLoadModal}
          onClose={() => {}}
          projectId={projectId || ''}
          studentId={student.id}
          questionNumber={cognitiveLoadQuestionNumber}
          phase={cognitiveLoadPhase}
          onSubmitSuccess={() => {
            setShowCognitiveLoadModal(false);
            if (pendingPhaseTransition) {
              pendingPhaseTransition();
              setPendingPhaseTransition(null);
            }
          }}
        />
      )}
    </div>
  );
};