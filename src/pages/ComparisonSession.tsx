import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Clock, ChevronLeft, ChevronRight, Minus, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdvancedComparisonLogic } from "@/hooks/useAdvancedComparisonLogic";
import { Progress } from "@/components/ui/progress";

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

  // 현재 사용자 정보 (교사 또는 학생)  
  const isStudent = !!student;
  const isTeacher = !!user && !!profile;
  const currentUserId = student?.id || user?.id;

  // 고급 비교 알고리즘 훅 사용
  const {
    currentPair,
    isInitialized,
    completionStats,
    reviewerStats,
    submitComparison,
    canContinue,
    getEstimatedTimeRemaining,
    getCurrentPhaseInfo,
    hasMoreComparisons,
    isComplete,
    reinitialize
  } = useAdvancedComparisonLogic({
    projectId: projectId || '',
    responses,
    reviewerId: student?.id || ''
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
      fetchProjectAndResponses();
    }
  }, [isStudent, isTeacher, projectId, navigate]);

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

  // 비교 완료 시 다음 문항으로 이동 또는 종료
  useEffect(() => {
    if (isInitialized && isComplete && !hasMoreComparisons) {
      if (currentQuestion < maxQuestions) {
        // 다음 문항으로 이동
        toast({
          title: `${currentQuestion}번 문항 완료!`,
          description: `${currentQuestion + 1}번 문항으로 이동합니다.`
        });
        setCurrentQuestion(prev => prev + 1);
      } else {
        // 모든 문항 완료 - project_assignments 업데이트
        updateProjectAssignmentCompletion();
        toast({
          title: "모든 비교 완료!",
          description: `${maxQuestions}개 문항의 비교를 모두 완료하셨습니다.`
        });
        navigate(isStudent ? '/student-dashboard' : '/dashboard');
      }
    }
  }, [isInitialized, isComplete, hasMoreComparisons, currentQuestion, maxQuestions, navigate, isStudent, toast]);

  // 프로젝트 할당 완료 상태 업데이트
  const updateProjectAssignmentCompletion = async () => {
    if (!student || !projectId) return;

    try {
      const { error } = await supabase
        .from('project_assignments')
        .update({
          has_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('student_id', student.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating project assignment completion:', error);
    }
  };

  const fetchProjectAndResponses = async () => {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, title, question, rubric')
        .eq('id', projectId)
        .eq('is_active', true)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch all responses for this project
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('*')
        .eq('project_id', projectId)
        .order('question_number');

      if (responsesError) throw responsesError;
      setAllResponses(responsesData || []);
      
      // 최대 문항 수 계산
      const maxQuestionNumber = Math.max(...(responsesData || []).map(r => r.question_number));
      setMaxQuestions(maxQuestionNumber);
      
      // 첫 번째 문항의 응답들로 시작
      const firstQuestionResponses = (responsesData || []).filter(r => r.question_number === 1);
      setResponses(firstQuestionResponses);
      
    } catch (error: any) {
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
      const success = await submitComparison(decision, comparisonTime);
      
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
    const questionMap: Record<number, string> = {
      1: "눈으로 보고 자를 잡을 때와 '땅' 소리를 들을 때의 자극 전달 과정을 감각 기관, 감각 신경, 대뇌 중추의 순서로 서술하시오.",
      2: "어두운 곳에서 밝은 곳으로 나왔을 때 일어나는 동공 반사의 자극 전달 과정을 서술하시오.",
      3: "무조건 반사란 무엇인지 쓰고, 무릎 반사를 예로 들어 자극 전달 과정과 그 의의를 서술하시오.",
      4: "온도 감각 실험에서 왼손과 오른손이 느끼는 감각을 예상하고 그 이유를 서술하시오.",
      5: "입에서는 5가지 맛만 느낄 수 있는데 더 다양한 맛을 느낄 수 있는 이유와 코막힘과 맛의 관계를 설명하시오."
    };
    return questionMap[questionNumber] || project?.question || "";
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

  if (!project || !currentPair) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {!isInitialized ? "알고리즘을 초기화하고 있습니다..." : "비교할 응답을 찾을 수 없습니다."}
          </p>
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
              {reviewerStats.completed}/15 완료
            </Badge>
            <Badge 
              variant={phaseInfo?.phase === 'balance' ? 'default' : 'destructive'} 
              className="flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              {phaseInfo?.phase === 'balance' ? '균형 단계' : '적응 단계'}
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
          {project.rubric && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">평가 기준:</h4>
              <p className="text-sm text-muted-foreground">{project.rubric}</p>
            </div>
          )}
          
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
            
            {phaseInfo && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">현재 단계: {phaseInfo.phase === 'balance' ? '균형 단계' : '적응 단계'}</p>
                <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
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