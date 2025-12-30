import { useState, useEffect, useMemo, useCallback } from "react";
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

interface StudentResponse {
  id: string;
  student_code: string;
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
    reviewerId: student?.student_number?.toString() || user?.id || '', // Use student_number as string to match with response.student_code
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
      if (!project || !student || !responsesLoaded) return;

      await fetchMyResponses();
      await fetchPreEvaluations();

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
      } else {
        setSessionPhase('comparing');
      }
    };

    initializeSession();
  }, [project, student, responsesLoaded, maxQuestions]);

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

  // 실제 완료된 비교 횟수를 확인하기 위한 state
  const [actualCompletedCount, setActualCompletedCount] = useState<number>(0);

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
        setActualCompletedCount(count);
        console.log(`Question ${currentQuestion}: ${count} comparisons completed in DB`);
      }
    };

    fetchActualCompletedCount();
  }, [student?.id, projectId, currentQuestion, reviewerStats?.completed]); // reviewerStats가 변경될 때마다 재조회

  // Check if current question is complete (dynamic based on session metadata)
  const requiredComparisonsForQuestion = sessionMetadata?.config.reviewerTargetPerPerson || 15;
  // Complete if target reached OR no more pairs available
  const isCurrentQuestionComplete = 
    actualCompletedCount >= requiredComparisonsForQuestion || 
    (!currentPair && !isInitializing && actualCompletedCount > 0);
  
  // Auto-advance to next question when current is complete (but not on the last question)
  useEffect(() => {
    if (isCurrentQuestionComplete && !isInitializing && currentQuestion < maxQuestions) {
      // For questions 1-4, auto-advance to next question
      if (currentQuestion < maxQuestions) {
        console.log(`Question ${currentQuestion} completed with ${reviewerStats?.completed} comparisons. Moving to next question.`);
        const timer = setTimeout(() => {
          setCurrentQuestion(prev => prev + 1);
        }, 1000); // Small delay to show completion message
        
        return () => clearTimeout(timer);
      }
    }
  }, [isCurrentQuestionComplete, isInitializing, currentQuestion, maxQuestions, reviewerStats?.completed]);

  // 완료 여부 추적
  const [hasUpdatedCompletion, setHasUpdatedCompletion] = useState(false);
  
  // 피드백 모달 상태
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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

  // Complete project assignment when all questions are done - now moves to post_evaluation
  useEffect(() => {
    if (allQuestionsComplete && !isInitializing && isStudent && sessionPhase === 'comparing') {
      console.log('All questions completed, moving to post evaluation');
      setPostEvaluationQuestion(1);
      setSessionPhase('post_evaluation');
    }
  }, [allQuestionsComplete, isInitializing, isStudent, sessionPhase]);

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
        .select('*')
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
      const success = await submitComparison(decision === 'left' ? 'A' : 'B');
      
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
        // 모든 사전 평가 완료 → 비교 시작
        await fetchPreEvaluations();
        setSessionPhase('comparing');
      }
    };

    return (
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
    );
  }

  // 사후 자기평가 단계
  if (sessionPhase === 'post_evaluation' && isStudent && student) {
    const preEval = preEvaluations.find(e => e.question_number === postEvaluationQuestion);
    
    const handlePostEvalComplete = () => {
      if (postEvaluationQuestion < maxQuestions) {
        setPostEvaluationQuestion(prev => prev + 1);
      } else {
        // 모든 사후 평가 완료 → 완료 화면
        setSessionPhase('completed');
      }
    };

    return (
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

  // Priority 1: Check if ALL questions are completed first
  if (allQuestionsComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-2xl mx-auto">
          <div className="h-20 w-20 text-green-500 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center text-3xl">
            🎉
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">평가 완료! 수고하셨습니다!</h2>
          <p className="text-lg text-muted-foreground mb-6">
            {maxQuestions}개 문항의 비교를 모두 완료하셨습니다.<br/>
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

  // Priority 2: Check if current question is completed (but not the last question)
  if (isCurrentQuestionComplete && currentQuestion < maxQuestions) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <div className="h-16 w-16 text-green-500 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            ✓
          </div>
          <h2 className="text-2xl font-bold mb-4">문항 {currentQuestion} 완료!</h2>
          <p className="text-muted-foreground mb-4">
            {currentQuestion}번 문항의 비교 {requiredComparisonsForQuestion}개가 완료되었습니다. 다음 문항으로 이동합니다.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>다음 문항 준비 중...</span>
          </div>
        </Card>
      </div>
    );
  }

  // 비교 쌍이 없고 초기화 중이 아니면 완료로 처리
  if (!currentPair && !isInitializing) {
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
            <CardTitle className="flex items-center justify-between">
              <span>응답 A</span>
              <Badge variant="outline">학생 {currentPair.responseA.student_code}</Badge>
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
            <CardTitle className="flex items-center justify-between">
              <span>응답 B</span>
              <Badge variant="outline">학생 {currentPair.responseB.student_code}</Badge>
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
    </div>
  );
};