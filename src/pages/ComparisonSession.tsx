import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Clock, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [responseA, setResponseA] = useState<StudentResponse | null>(null);
  const [responseB, setResponseB] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // 현재 사용자 정보 (교사 또는 학생)
  const isStudent = !!student;
  const isTeacher = !!user && !!profile;
  const currentUserId = student?.id || user?.id;

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (submitting || !responseA || !responseB || !isStudent) return;
      
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
  }, [submitting, responseA, responseB, isStudent]);

  useEffect(() => {
    if (!isStudent && !isTeacher) {
      navigate('/student-login');
      return;
    }
    
    if (projectId) {
      fetchProjectAndResponses();
    }
  }, [isStudent, isTeacher, projectId, navigate]);

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
        .eq('project_id', projectId);

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // Get comparison count - only for students, teachers can view all
      let comparisonQuery = supabase
        .from('comparisons')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      
    if (isStudent) {
      comparisonQuery = comparisonQuery.eq('student_id', student?.id);
    }
      
      const { count } = await comparisonQuery;

      setComparisonCount(count || 0);

      // Load first comparison pair
      loadNextComparison(responsesData || []);
      
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

  const loadNextComparison = async (allResponses: StudentResponse[]) => {
    if (allResponses.length < 2) {
      toast({
        variant: "destructive",
        title: "비교할 응답이 부족합니다",
        description: "최소 2개의 응답이 필요합니다."
      });
      navigate(isStudent ? '/student-dashboard' : '/dashboard');
      return;
    }

    // Get already compared pairs - only for students
    let comparisonQuery = supabase
      .from('comparisons')
      .select('response_a_id, response_b_id')
      .eq('project_id', projectId);
    
    if (isStudent) {
      comparisonQuery = comparisonQuery.eq('student_id', student?.id);
    }
    
    const { data: existingComparisons } = await comparisonQuery;

    const comparedPairs = new Set(
      (existingComparisons || []).map(c => 
        [c.response_a_id, c.response_b_id].sort().join('-')
      )
    );

    // Find an uncompared pair
    let foundPair = false;
    for (let i = 0; i < allResponses.length && !foundPair; i++) {
      for (let j = i + 1; j < allResponses.length && !foundPair; j++) {
        const pairKey = [allResponses[i].id, allResponses[j].id].sort().join('-');
        if (!comparedPairs.has(pairKey)) {
          setResponseA(allResponses[i]);
          setResponseB(allResponses[j]);
          setStartTime(Date.now());
          foundPair = true;
        }
      }
    }

    if (!foundPair) {
      toast({
        title: "모든 비교 완료!",
        description: "이 프로젝트의 모든 응답 쌍을 비교하셨습니다."
      });
      navigate(isStudent ? '/student-dashboard' : '/dashboard');
    }
  };

  const handleChoice = async (decision: 'left' | 'right' | 'neutral') => {
    if (!responseA || !responseB || !currentUserId) return;
    
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
      const { error } = await supabase
        .from('comparisons')
        .insert({
          project_id: projectId,
          student_id: student?.id, // Use student.id from students table
          response_a_id: responseA.id,
          response_b_id: responseB.id,
          decision: decision,
          comparison_time_ms: comparisonTime
        });

      if (error) throw error;

      setComparisonCount(prev => prev + 1);
      
      const decisionText = decision === 'left' ? '응답 A' : decision === 'right' ? '응답 B' : '중립';
      toast({
        title: "비교 완료",
        description: `${decisionText}를 선택했습니다. 다음 비교를 진행합니다.`
      });

      // Load next comparison
      loadNextComparison(responses);

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

  if (!project || !responseA || !responseB) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">비교할 응답을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

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
            <p className="text-muted-foreground mt-2">다음 두 응답을 비교하여 더 좋은 응답을 선택하세요</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {comparisonCount}번 완료
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">평가 질문</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-4">
            {responseA && responseB && responseA.question_number === responseB.question_number 
              ? getQuestionByNumber(responseA.question_number)
              : project.question}
          </p>
          {project.rubric && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">평가 기준:</h4>
              <p className="text-sm text-muted-foreground">{project.rubric}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>응답 A</span>
              <Badge variant="outline">학생 {responseA.student_code}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {responseA.response_text}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>응답 B</span>
              <Badge variant="outline">학생 {responseB.student_code}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {responseB.response_text}
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