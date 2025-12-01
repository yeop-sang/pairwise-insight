import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExplainability } from '@/hooks/useExplainability';
import { Download } from 'lucide-react';
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
  const { loading, goodWords, badWords, extractFeatures } = useExplainability();
  
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(
    Array.from({ length: maxQuestions }, (_, i) => i + 1)
  );
  const [topK, setTopK] = useState<number>(5);

  useEffect(() => {
    extractFeatures({
      project_id: projectId,
      question_numbers: selectedQuestions,
      top_k: topK,
      persist: true
    });
  }, [projectId, topK, selectedQuestions]);

  const handleQuestionToggle = (questionNum: number) => {
    setSelectedQuestions(prev =>
      prev.includes(questionNum)
        ? prev.filter(q => q !== questionNum)
        : [...prev, questionNum].sort()
    );
  };

  const handleDownloadGoodWords = () => {
    if (goodWords.length === 0) return;
    const csvContent = ['word,score', ...goodWords.map(w => `${w.word},${w.score}`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `good_words_${projectId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBadWords = () => {
    if (badWords.length === 0) return;
    const csvContent = ['word,score', ...badWords.map(w => `${w.word},${w.score}`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bad_words_${projectId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>키워드 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">문항 선택</Label>
            <div className="flex gap-4 flex-wrap">
              {Array.from({ length: maxQuestions }, (_, i) => i + 1).map(q => (
                <div key={q} className="flex items-center space-x-2">
                  <Checkbox
                    id={`explain-question-${q}`}
                    checked={selectedQuestions.includes(q)}
                    onCheckedChange={() => handleQuestionToggle(q)}
                  />
                  <label htmlFor={`explain-question-${q}`} className="text-sm font-medium">
                    문항 {q}
                  </label>
                </div>
              ))}
            </div>
          </div>

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

          {loading && (
            <div className="text-sm text-muted-foreground">키워드 추출 중...</div>
          )}
        </CardContent>
      </Card>

      {goodWords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-green-600">좋은 키워드 ({goodWords.length})</CardTitle>
            <Button onClick={handleDownloadGoodWords} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead>가중치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goodWords.map((word, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{word.word}</TableCell>
                    <TableCell className="text-green-600">
                      {word.score.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {badWords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-red-600">나쁜 키워드 ({badWords.length})</CardTitle>
            <Button onClick={handleDownloadBadWords} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead>가중치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badWords.map((word, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{word.word}</TableCell>
                    <TableCell className="text-red-600">
                      {word.score.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
