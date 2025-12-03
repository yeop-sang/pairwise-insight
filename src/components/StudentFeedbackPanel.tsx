import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Save, RefreshCw, Download, FileText } from 'lucide-react';
import { useStudentFeedback } from '@/hooks/useStudentFeedback';
import * as XLSX from 'xlsx';

interface StudentFeedbackPanelProps {
  projectId: string;
  maxQuestions: number;
}

export const StudentFeedbackPanel = ({ projectId, maxQuestions }: StudentFeedbackPanelProps) => {
  const [selectedQuestion, setSelectedQuestion] = useState(1);
  const {
    responses,
    goodKeywords,
    loading,
    customDirection,
    setCustomDirection,
    fetchResponses,
    generateFeedback,
    generateAllFeedback,
    saveFeedback,
    updateEditedFeedback,
  } = useStudentFeedback(projectId);

  useEffect(() => {
    fetchResponses(selectedQuestion);
  }, [selectedQuestion, fetchResponses]);

  const handleDownloadExcel = () => {
    const dataToExport = responses
      .filter(r => r.editedFeedback)
      .map(r => ({
        '학생코드': r.student_code,
        '원본 응답': r.response_text,
        '피드백': r.editedFeedback || '',
      }));

    if (dataToExport.length === 0) {
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `문항${selectedQuestion}_피드백`);
    XLSX.writeFile(wb, `피드백_문항${selectedQuestion}.xlsx`);
  };

  const questionTabs = Array.from({ length: maxQuestions }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Feedback Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            피드백 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              피드백 방향성 (선택사항)
            </label>
            <Textarea
              placeholder="예: 피드백은 학생이 잘못된 부분보다는, 나아갈 수 있는 방향성을 제시할 수 있게 작성해주세요."
              value={customDirection}
              onChange={(e) => setCustomDirection(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              이 내용이 AI 프롬프트에 추가되어 피드백 생성에 반영됩니다.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => generateAllFeedback(selectedQuestion)}
              disabled={loading || goodKeywords.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              전체 피드백 생성
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadExcel}
              disabled={responses.filter(r => r.editedFeedback).length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>

          {goodKeywords.length === 0 && (
            <p className="text-sm text-destructive">
              ⚠️ 키워드가 없습니다. 먼저 "키워드" 탭에서 키워드를 추출해주세요.
            </p>
          )}

          {goodKeywords.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">사용 중인 좋은 키워드 (상위 {goodKeywords.length}개)</p>
              <div className="flex flex-wrap gap-1">
                {goodKeywords.slice(0, 10).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {kw.word}
                  </Badge>
                ))}
                {goodKeywords.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{goodKeywords.length - 10}개 더
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Tabs */}
      <Tabs value={String(selectedQuestion)} onValueChange={(v) => setSelectedQuestion(Number(v))}>
        <TabsList>
          {questionTabs.map((q) => (
            <TabsTrigger key={q} value={String(q)}>
              문항 {q}
            </TabsTrigger>
          ))}
        </TabsList>

        {questionTabs.map((q) => (
          <TabsContent key={q} value={String(q)} className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>로딩 중...</span>
              </div>
            ) : responses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  이 문항에 대한 학생 응답이 없습니다.
                </CardContent>
              </Card>
            ) : (
              responses.map((response) => (
                <Card key={response.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        학생 코드: {response.student_code}
                      </CardTitle>
                      {response.feedback && (
                        <Badge variant="outline" className="text-xs">
                          저장됨
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Original Response */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          원본 응답
                        </label>
                        <div className="p-3 bg-muted/50 rounded-md text-sm min-h-[120px] whitespace-pre-wrap">
                          {response.response_text}
                        </div>
                      </div>

                      {/* Feedback */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          AI 피드백
                        </label>
                        {response.editedFeedback ? (
                          <Textarea
                            value={response.editedFeedback}
                            onChange={(e) => updateEditedFeedback(response.id, e.target.value)}
                            className="min-h-[120px] text-sm"
                          />
                        ) : (
                          <div className="p-3 bg-muted/30 rounded-md text-sm min-h-[120px] text-muted-foreground flex items-center justify-center">
                            피드백이 없습니다. 생성해주세요.
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-2">
                          {response.editedFeedback ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateFeedback(
                                  response.id,
                                  response.student_code,
                                  response.response_text,
                                  selectedQuestion
                                )}
                                disabled={response.isGenerating}
                              >
                                {response.isGenerating ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                재생성
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveFeedback(
                                  response.id,
                                  response.student_code,
                                  selectedQuestion,
                                  response.response_text,
                                  response.editedFeedback || ''
                                )}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                저장
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => generateFeedback(
                                response.id,
                                response.student_code,
                                response.response_text,
                                selectedQuestion
                              )}
                              disabled={response.isGenerating || goodKeywords.length === 0}
                            >
                              {response.isGenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Sparkles className="h-3 w-3 mr-1" />
                              )}
                              피드백 생성
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
