import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Download, Trophy, Target } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
interface ComparisonResult {
  response_id: string;
  student_code: string;
  win_count: number;
  loss_count: number;
  tie_count: number;
  total_comparisons: number;
  win_rate: number;
  rank: number;
  question_number: number;
}
interface Project {
  id: string;
  title: string;
  question: string;
  rubric?: string;
}
export const ComparisonResults = () => {
  const {
    projectId
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<number>(1);
  const [maxQuestions, setMaxQuestions] = useState<number>(5);
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchResultsData();
  }, [projectId, user]);
  const fetchResultsData = async () => {
    if (!projectId) return;
    try {
      // Fetch project details
      const {
        data: projectData,
        error: projectError
      } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (projectError) throw projectError;
      setProject(projectData);

      // Get question numbers first
      const {
        data: responseData,
        error: responseError
      } = await supabase.from('student_responses').select('question_number').eq('project_id', projectId);
      if (responseError) throw responseError;
      const questionNumbers = [...new Set(responseData?.map(r => r.question_number) || [])].sort();
      const maxQ = Math.max(...questionNumbers);
      setMaxQuestions(maxQ);

      // Call the ranking calculation function for all questions
      const allResults: ComparisonResult[] = [];
      for (const qNum of questionNumbers) {
        try {
          const {
            data: resultsData,
            error: resultsError
          } = await supabase.rpc('calculate_response_rankings', {
            project_uuid: projectId,
            question_num: qNum
          });
          if (resultsError) throw resultsError;
          const questionResults: ComparisonResult[] = (resultsData || []).map((r: any) => ({
            ...r,
            question_number: qNum
          }));
          allResults.push(...questionResults);
        } catch (err) {
          console.error(`Error calculating results for question ${qNum}:`, err);
          // Continue with other questions even if one fails
        }
      }
      setResults(allResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  const exportToExcel = () => {
    if (!results.length || !project) return;

    // 문항별로 데이터 정리
    const questionNumbers = [...new Set(results.map(r => r.question_number))].sort();
    const wb = XLSX.utils.book_new();

    // 각 문항별로 시트 생성
    questionNumbers.forEach(qNum => {
      const questionResults = results.filter(r => r.question_number === qNum);
      const exportData = questionResults.map(result => ({
        '순위': result.rank,
        '학생코드': result.student_code,
        '승률': result.win_rate.toFixed(1) + '%',
        '승리횟수': result.win_count,
        '패배횟수': result.loss_count,
        '무승부': result.tie_count,
        '총비교횟수': result.total_comparisons
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, `${qNum}번 문항`);
    });

    // 전체 요약 시트
    const summaryData = questionNumbers.map(qNum => {
      const questionResults = results.filter(r => r.question_number === qNum);
      const firstPlace = questionResults.find(r => r.rank === 1);
      return {
        '문항번호': qNum,
        '1등학생': firstPlace?.student_code || '-',
        '1등승률': firstPlace ? firstPlace.win_rate.toFixed(1) + '%' : '-',
        '총응답수': questionResults.length,
        '총비교수': questionResults.reduce((sum, r) => sum + r.total_comparisons, 0)
      };
    });
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, '전체 요약');
    XLSX.writeFile(wb, `${project.title}_문항별_비교결과.xlsx`);
    toast.success('결과를 Excel 파일로 내보냈습니다.');
  };
  const getRankColor = (rank: number) => {
    return 'bg-primary/10 text-primary border border-primary/20';
  };
  const getRankIcon = (rank: number) => {
    return null; // No icons needed
  };

  // 문항별 질문 내용
  const getQuestionTitle = (questionNumber: number) => {
    const questionMap: Record<number, string> = {
      1: "감각 기관과 자극 전달 과정",
      2: "동공 반사의 자극 전달 과정",
      3: "무조건 반사와 무릎 반사",
      4: "온도 감각 실험",
      5: "다양한 맛과 후각의 관계"
    };
    return questionMap[questionNumber] || `${questionNumber}번 문항`;
  };
  const filteredResults = results.filter(r => r.question_number === selectedQuestion);
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">결과를 분석하고 있습니다...</p>
        </div>
      </div>;
  }
  if (!project) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">프로젝트를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              대시보드로 돌아가기
            </Button>
            <h1 className="text-3xl font-bold">{project.title} - 문항별 비교 결과</h1>
            
          </div>
          <Button onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Excel 내보내기 (전체)
          </Button>
        </div>

        <Tabs value={selectedQuestion.toString()} onValueChange={value => setSelectedQuestion(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            {[1, 2, 3, 4, 5].slice(0, maxQuestions).map(qNum => <TabsTrigger key={qNum} value={qNum.toString()}>
                {qNum}번 문항
              </TabsTrigger>)}
          </TabsList>
          
          {[1, 2, 3, 4, 5].slice(0, maxQuestions).map(qNum => <TabsContent key={qNum} value={qNum.toString()}>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{qNum}번 문항: {getQuestionTitle(qNum)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    이 문항에 대한 학생들의 응답을 쌍대비교로 분석한 결과입니다.
                  </p>
                </CardContent>
              </Card>

              {filteredResults.length === 0 ? <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-lg text-muted-foreground">아직 이 문항에 대한 비교 데이터가 없습니다.</p>
                    <p className="text-sm text-muted-foreground mt-2">학생들이 비교를 시작하면 결과가 여기에 표시됩니다.</p>
                  </CardContent>
                </Card> : <div className="grid gap-4">
                  {filteredResults.map(result => <Card key={result.response_id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${getRankColor(result.rank)}`}>
                              <span>{result.rank}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">{result.student_code}</h3>
                              <p className="text-sm text-muted-foreground">
                                승률: {result.win_rate.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-primary">{result.win_rate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">승률</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-lg font-semibold text-green-600">{result.win_count}</p>
                              <p className="text-xs text-muted-foreground">승리</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-lg font-semibold text-red-600">{result.loss_count}</p>
                              <p className="text-xs text-muted-foreground">패배</p>
                            </div>

                            <div className="text-center">
                              <p className="text-lg font-semibold text-gray-600">{result.tie_count}</p>
                              <p className="text-xs text-muted-foreground">무승부</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-lg font-semibold">{result.total_comparisons}</p>
                              <p className="text-xs text-muted-foreground">총 비교</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">승률</span>
                            <span className="text-sm font-medium">
                              {result.win_rate.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={result.win_rate} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>)}
                </div>}
            </TabsContent>)}
        </Tabs>
      </div>
    </div>;
};