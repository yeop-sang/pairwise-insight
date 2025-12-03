import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExplainability } from '@/hooks/useExplainability';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExplainabilityPanelProps {
  projectId: string;
  maxQuestions: number;
}

export const ExplainabilityPanel = ({
  projectId,
  maxQuestions
}: ExplainabilityPanelProps) => {
  const { 
    loading, 
    keywordsByQuestion, 
    extractFeaturesByQuestion,
    extractAllQuestionFeatures 
  } = useExplainability();
  
  const [selectedQuestion, setSelectedQuestion] = useState(1);
  const [topK, setTopK] = useState<number>(10);

  const questionTabs = Array.from({ length: maxQuestions }, (_, i) => i + 1);

  const handleExtractAll = () => {
    extractAllQuestionFeatures(projectId, maxQuestions, topK);
  };

  const handleExtractSingle = (questionNumber: number) => {
    extractFeaturesByQuestion(projectId, questionNumber, topK);
  };

  const currentKeywords = keywordsByQuestion[selectedQuestion];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>키워드 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <Label htmlFor="topk">추출할 키워드 개수</Label>
              <Select value={topK.toString()} onValueChange={(val) => setTopK(Number(val))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5개</SelectItem>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="15">15개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="25">25개</SelectItem>
                  <SelectItem value="30">30개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleExtractAll} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              전체 문항 키워드 추출
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Tabs */}
      <Tabs value={String(selectedQuestion)} onValueChange={(v) => setSelectedQuestion(Number(v))}>
        <TabsList>
          {questionTabs.map((q) => (
            <TabsTrigger key={q} value={String(q)}>
              문항 {q}
              {keywordsByQuestion[q]?.goodWords?.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({keywordsByQuestion[q].goodWords.length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {questionTabs.map((q) => {
          const keywords = keywordsByQuestion[q];
          const isLoading = keywords?.loading;
          const hasKeywords = keywords?.goodWords?.length > 0 || keywords?.badWords?.length > 0;

          return (
            <TabsContent key={q} value={String(q)} className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>문항 {q} 키워드 추출 중...</span>
                </div>
              ) : !hasKeywords ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      문항 {q}의 키워드가 아직 추출되지 않았습니다.
                    </p>
                    <Button onClick={() => handleExtractSingle(q)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      문항 {q} 키워드 추출
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Good Words */}
                  {keywords?.goodWords?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-green-600">
                          좋은 키워드 ({keywords.goodWords.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">순위</TableHead>
                              <TableHead>키워드</TableHead>
                              <TableHead className="w-20">가중치</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {keywords.goodWords.map((word, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{word.word}</TableCell>
                                <TableCell className="text-green-600">
                                  {word.score.toFixed(3)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Bad Words */}
                  {keywords?.badWords?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-red-600">
                          나쁜 키워드 ({keywords.badWords.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">순위</TableHead>
                              <TableHead>키워드</TableHead>
                              <TableHead className="w-20">가중치</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {keywords.badWords.map((word, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{word.word}</TableCell>
                                <TableCell className="text-red-600">
                                  {word.score.toFixed(3)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {hasKeywords && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExtractSingle(q)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    다시 추출
                  </Button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
