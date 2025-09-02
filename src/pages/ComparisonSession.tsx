import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [responseA, setResponseA] = useState<StudentResponse | null>(null);
  const [responseB, setResponseB] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (user && projectId) {
      fetchProjectAndResponses();
    }
  }, [user, projectId]);

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

      // Get comparison count for this student
      const { count } = await supabase
        .from('comparisons')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('student_id', user?.id);

      setComparisonCount(count || 0);

      // Load first comparison pair
      loadNextComparison(responsesData || []);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "프로젝트 로드 실패",
        description: error.message
      });
      navigate('/student-dashboard');
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
      navigate('/student-dashboard');
      return;
    }

    // Get already compared pairs
    const { data: existingComparisons } = await supabase
      .from('comparisons')
      .select('response_a_id, response_b_id')
      .eq('project_id', projectId)
      .eq('student_id', user?.id);

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
      navigate('/student-dashboard');
    }
  };

  const handleChoice = async (chosenResponse: StudentResponse) => {
    if (!responseA || !responseB || !user) return;

    setSubmitting(true);
    const comparisonTime = Date.now() - startTime;

    try {
      const { error } = await supabase
        .from('comparisons')
        .insert({
          project_id: projectId,
          student_id: user.id,
          response_a_id: responseA.id,
          response_b_id: responseB.id,
          decision: chosenResponse.id === responseA.id ? 'A' : 'B',
          comparison_time_ms: comparisonTime
        });

      if (error) throw error;

      setComparisonCount(prev => prev + 1);
      
      toast({
        title: "비교 완료",
        description: "다음 비교를 진행합니다."
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
          onClick={() => navigate("/student-dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          대시보드로 돌아가기
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
          <p className="text-foreground mb-4">{project.question}</p>
          {project.rubric && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">평가 기준:</h4>
              <p className="text-sm text-muted-foreground">{project.rubric}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-medium transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary"
              onClick={() => !submitting && handleChoice(responseA)}>
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
            <Button 
              className="w-full mt-4" 
              onClick={(e) => {
                e.stopPropagation();
                handleChoice(responseA);
              }}
              disabled={submitting}
            >
              {submitting ? "저장 중..." : "응답 A 선택"}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary"
              onClick={() => !submitting && handleChoice(responseB)}>
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
            <Button 
              className="w-full mt-4" 
              onClick={(e) => {
                e.stopPropagation();
                handleChoice(responseB);
              }}
              disabled={submitting}
            >
              {submitting ? "저장 중..." : "응답 B 선택"}
            </Button>
          </CardContent>
        </Card>
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