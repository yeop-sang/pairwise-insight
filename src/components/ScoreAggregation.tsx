import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ScoreAggregationProps {
  projectId: string;
  maxQuestions: number;
}

interface ComparisonResult {
  response_id: string;
  student_code: string;
  response_text: string;
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

export const ScoreAggregation = ({
  projectId,
  maxQuestions
}: ScoreAggregationProps) => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [overallResults, setOverallResults] = useState<OverallResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("overall");

  useEffect(() => {
    fetchResultsData();
  }, [projectId]);

  const fetchResultsData = async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const { data: responseData, error: responseError } = await supabase
        .from('student_responses')
        .select('question_number')
        .eq('project_id', projectId);

      if (responseError) throw responseError;

      const questionNumbers = [...new Set(responseData?.map(r => r.question_number) || [])].sort();
      const allResults: ComparisonResult[] = [];

      // 응답 텍스트 가져오기
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('id, student_code, response_text, question_number')
        .eq('project_id', projectId);

      const responseTextMap = new Map<string, string>();
      (responsesData || []).forEach(r => {
        responseTextMap.set(r.id, r.response_text);
      });

      for (const qNum of questionNumbers) {
        try {
          const { data: resultsData, error: resultsError } = await supabase.rpc(
            'calculate_response_rankings',
            { project_uuid: projectId, question_num: qNum }
          );

          if (resultsError) throw resultsError;

          const questionResults: ComparisonResult[] = (resultsData || []).map((r: any) => ({
            ...r,
            question_number: qNum,
            response_text: responseTextMap.get(r.response_id) || ''
          }));
          allResults.push(...questionResults);
        } catch (err) {
          console.error(`Error calculating results for question ${qNum}:`, err);
        }
      }
      setResults(allResults);

      // Calculate overall results by aggregating wins/losses across all questions
      const studentMap = new Map<string, {
        total_win_count: number;
        total_loss_count: number;
        total_tie_count: number;
        total_comparisons: number;
        questions_participated: Set<number>;
      }>();

      allResults.forEach(result => {
        const existing = studentMap.get(result.student_code) || {
          total_win_count: 0,
          total_loss_count: 0,
          total_tie_count: 0,
          total_comparisons: 0,
          questions_participated: new Set<number>()
        };

        existing.total_win_count += result.win_count;
        existing.total_loss_count += result.loss_count;
        existing.total_tie_count += result.tie_count;
        existing.total_comparisons += result.total_comparisons;
        existing.questions_participated.add(result.question_number);

        studentMap.set(result.student_code, existing);
      });

      // Convert to array and calculate overall win rate
      const calculatedOverallResults: OverallResult[] = Array.from(studentMap.entries()).map(([student_code, data]) => ({
        student_code,
        total_win_count: data.total_win_count,
        total_loss_count: data.total_loss_count,
        total_tie_count: data.total_tie_count,
        total_comparisons: data.total_comparisons,
        overall_win_rate: data.total_comparisons > 0 
          ? (data.total_win_count / data.total_comparisons) * 100 
          : 0,
        questions_participated: data.questions_participated.size,
        rank: 0 // Will be assigned after sorting
      }));

      // Sort by win rate (descending) and assign ranks
      calculatedOverallResults.sort((a, b) => {
        if (b.overall_win_rate !== a.overall_win_rate) {
          return b.overall_win_rate - a.overall_win_rate;
        }
        // If win rates are equal, sort by total wins
        return b.total_win_count - a.total_win_count;
      });

      calculatedOverallResults.forEach((result, index) => {
        result.rank = index + 1;
      });

      setOverallResults(calculatedOverallResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('점수를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!results.length || !projectId) return;

    const questionNumbers = [...new Set(results.map(r => r.question_number))].sort();
    const wb = XLSX.utils.book_new();

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

    for (const qNum of questionNumbers) {
      const questionResults = results.filter(r => r.question_number === qNum);
      const exportData: any[] = questionResults.map(result => ({
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
    }

    XLSX.writeFile(wb, `점수집계_${projectId}.xlsx`);
    toast.success('결과를 Excel 파일로 내보냈습니다.');
  };

  const getRankColor = (rank: number) => {
    return 'bg-primary/10 text-primary border border-primary/20';
  };

  const filteredResults = selectedQuestion === "overall" 
    ? [] 
    : results.filter(r => r.question_number === parseInt(selectedQuestion));

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">점수를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">점수 집계</h2>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Excel 내보내기
        </Button>
      </div>

      <Tabs value={selectedQuestion} onValueChange={setSelectedQuestion}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${maxQuestions + 1}, 1fr)` }}>
          <TabsTrigger value="overall">종합 순위</TabsTrigger>
          {Array.from({ length: maxQuestions }, (_, i) => i + 1).map(qNum => (
            <TabsTrigger key={qNum} value={qNum.toString()}>
              {qNum}번 문항
            </TabsTrigger>
          ))}
        </TabsList>

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

          {overallResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-lg text-muted-foreground">아직 종합 순위 데이터가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {overallResults.map(result => (
                <Card key={result.student_code} className="overflow-hidden">
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {Array.from({ length: maxQuestions }, (_, i) => i + 1).map(qNum => (
          <TabsContent key={qNum} value={qNum.toString()}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{qNum}번 문항 점수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  이 문항에 대한 학생들의 응답을 쌍대비교로 분석한 결과입니다.
                </p>
              </CardContent>
            </Card>

            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-lg text-muted-foreground">아직 이 문항에 대한 비교 데이터가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredResults.map(result => (
                  <Card key={result.response_id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${getRankColor(result.rank)}`}>
                            <span>{result.rank}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.response_text || '(응답 없음)'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              학생 코드: {result.student_code} | 승률: {result.win_rate.toFixed(1)}%
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
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
