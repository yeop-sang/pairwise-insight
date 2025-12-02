import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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

interface OverallResult {
  student_code: string;
  total_win_count: number;
  total_loss_count: number;
  total_tie_count: number;
  total_comparisons: number;
  overall_win_rate: number;
  questions_participated: number;
  rank: number;
}

interface HeadToHeadResult {
  response_a_code: string;
  response_b_code: string;
  a_wins: number;
  b_wins: number;
  ties: number;
  total_comparisons: number;
}
interface Project {
  id: string;
  title: string;
  question: string | null;
  rubric?: string;
}

interface QuestionData {
  [key: number]: string;
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
  const [overallResults, setOverallResults] = useState<OverallResult[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("overall");
  const [maxQuestions, setMaxQuestions] = useState<number>(5);
  const [questionTitles, setQuestionTitles] = useState<QuestionData>({});
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

      // Parse question titles from JSON
      if (projectData.question) {
        try {
          const parsedQuestions = JSON.parse(projectData.question) as QuestionData;
          setQuestionTitles(parsedQuestions);
        } catch (err) {
          console.error("Failed to parse question data:", err);
        }
      }

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

      // Fetch overall rankings
      try {
        const { data: overallData, error: overallError } = await supabase.rpc('calculate_overall_student_rankings', {
          project_uuid: projectId
        });
        if (overallError) throw overallError;
        setOverallResults(overallData || []);
      } catch (err) {
        console.error('Error calculating overall results:', err);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  const exportToExcel = async () => {
    if (!results.length || !project || !projectId) return;

    // 문항별로 데이터 정리
    const questionNumbers = [...new Set(results.map(r => r.question_number))].sort();
    const wb = XLSX.utils.book_new();

    // 종합 순위 시트 (첫 번째 시트로)
    if (overallResults.length > 0) {
      const overallExportData = overallResults.map(result => ({
        '종합순위': result.rank,
        '학생코드': result.student_code,
        '종합승률': result.overall_win_rate.toFixed(1) + '%',
        '총승리': result.total_win_count,
        '총패배': result.total_loss_count,
        '총무승부': result.total_tie_count,
        '총비교횟수': result.total_comparisons,
        '참여문항수': result.questions_participated
      }));
      const overallWs = XLSX.utils.json_to_sheet(overallExportData);
      XLSX.utils.book_append_sheet(wb, overallWs, '종합 순위');
    }

    // 각 문항별로 시트 생성 (순위 + 상세 대결표)
    for (const qNum of questionNumbers) {
      const questionResults = results.filter(r => r.question_number === qNum);
      
      // 기본 순위 데이터
      const exportData: any[] = questionResults.map(result => ({
        '순위': result.rank,
        '학생코드': result.student_code,
        '승률': result.win_rate.toFixed(1) + '%',
        '승리횟수': result.win_count,
        '패배횟수': result.loss_count,
        '무승부': result.tie_count,
        '총비교횟수': result.total_comparisons
      }));

      // 상세 대결표 가져오기
      try {
        const { data: h2hData } = await supabase.rpc('get_headtohead_comparisons', {
          project_uuid: projectId,
          question_num: qNum
        });

        if (h2hData && h2hData.length > 0) {
          // 빈 줄 추가
          exportData.push({});
          exportData.push({ '순위': '=== 상세 대결 기록 ===' });
          exportData.push({});

          // 대결표 추가
          const h2hExportData = (h2hData as HeadToHeadResult[]).map(h2h => ({
            '학생A': h2h.response_a_code,
            '학생B': h2h.response_b_code,
            'A승': h2h.a_wins,
            'B승': h2h.b_wins,
            '무승부': h2h.ties,
            '총대결': h2h.total_comparisons
          }));
          exportData.push(...h2hExportData);
        }
      } catch (err) {
        console.error(`Error fetching head-to-head for question ${qNum}:`, err);
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, `${qNum}번 문항`);
    }

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
    XLSX.utils.book_append_sheet(wb, summaryWs, '문항별 요약');
    
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
    return questionTitles[questionNumber] || `문항 ${questionNumber}`;
  };
  const filteredResults = selectedQuestion === "overall" 
    ? [] 
    : results.filter(r => r.question_number === parseInt(selectedQuestion));
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

        <Tabs value={selectedQuestion} onValueChange={value => setSelectedQuestion(value)}>
          <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${maxQuestions + 1}, 1fr)` }}>
            <TabsTrigger value="overall">
              종합 순위
            </TabsTrigger>
            {[1, 2, 3, 4, 5].slice(0, maxQuestions).map(qNum => <TabsTrigger key={qNum} value={qNum.toString()}>
                {qNum}번 문항
              </TabsTrigger>)}
          </TabsList>

          {/* 종합 순위 탭 */}
          <TabsContent value="overall">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>전체 문항 종합 순위</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  모든 문항에 대한 학생들의 종합 평가 결과입니다.
                </p>
              </CardContent>
            </Card>

            {overallResults.length === 0 ? <Card>
                <CardContent className="text-center py-12">
                  <p className="text-lg text-muted-foreground">아직 종합 순위 데이터가 없습니다.</p>
                </CardContent>
              </Card> : <div className="grid gap-4">
                {overallResults.map(result => <Card key={result.student_code} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${getRankColor(result.rank)}`}>
                            <span>{result.rank}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{result.student_code}</h3>
                            <p className="text-sm text-muted-foreground">
                              참여 문항: {result.questions_participated}개
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{result.overall_win_rate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">종합 승률</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-lg font-semibold text-green-600">{result.total_win_count}</p>
                            <p className="text-xs text-muted-foreground">총 승리</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-lg font-semibold text-red-600">{result.total_loss_count}</p>
                            <p className="text-xs text-muted-foreground">총 패배</p>
                          </div>

                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-600">{result.total_tie_count}</p>
                            <p className="text-xs text-muted-foreground">총 무승부</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-lg font-semibold">{result.total_comparisons}</p>
                            <p className="text-xs text-muted-foreground">총 비교</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">종합 승률</span>
                          <span className="text-sm font-medium">
                            {result.overall_win_rate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={result.overall_win_rate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
          </TabsContent>
          
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