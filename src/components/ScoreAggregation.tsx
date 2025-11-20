import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useScoreAggregation } from '@/hooks/useScoreAggregation';
import { Download, Calculator, RotateCw } from 'lucide-react';
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

export const ScoreAggregation = ({
  projectId,
  maxQuestions
}: ScoreAggregationProps) => {
  const { loading, scores, aggregateScores, fetchAggregatedScores } = useScoreAggregation();
  
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(
    Array.from({ length: maxQuestions }, (_, i) => i + 1)
  );
  
  const [weights, setWeights] = useState<Record<number, number>>(
    Object.fromEntries(
      Array.from({ length: maxQuestions }, (_, i) => [i + 1, 1 / maxQuestions])
    )
  );

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.01;

  const handleQuestionToggle = (questionNum: number) => {
    setSelectedQuestions(prev =>
      prev.includes(questionNum)
        ? prev.filter(q => q !== questionNum)
        : [...prev, questionNum].sort()
    );
  };

  const handleWeightChange = (questionNum: number, value: number[]) => {
    setWeights(prev => ({ ...prev, [questionNum]: value[0] }));
  };

  const handleEqualWeights = () => {
    const equalWeight = 1 / selectedQuestions.length;
    setWeights(
      Object.fromEntries(
        selectedQuestions.map(q => [q, equalWeight])
      )
    );
  };

  const handleCalculate = async () => {
    if (!isWeightValid) {
      alert('가중치의 합이 1.0이 되어야 합니다.');
      return;
    }

    await aggregateScores({
      project_id: projectId,
      question_numbers: selectedQuestions,
      method: 'weighted_avg',
      weights,
      persist: true
    });
  };

  const handleDownloadCSV = () => {
    if (scores.length === 0) return;

    const headers = ['student_code', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'total_score', 'rank'];
    const csvContent = [
      headers.join(','),
      ...scores.map(row =>
        [
          row.student_code,
          row.q1_score ?? '',
          row.q2_score ?? '',
          row.q3_score ?? '',
          row.q4_score ?? '',
          row.q5_score ?? '',
          row.total_score,
          row.rank
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aggregated_scores_${projectId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAggregatedScores(projectId).catch(() => {});
  }, [projectId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>문항 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Array.from({ length: maxQuestions }, (_, i) => i + 1).map(q => (
              <div key={q} className="flex items-center space-x-2">
                <Checkbox
                  id={`question-${q}`}
                  checked={selectedQuestions.includes(q)}
                  onCheckedChange={() => handleQuestionToggle(q)}
                />
                <label htmlFor={`question-${q}`} className="text-sm font-medium">
                  문항 {q}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>가중치 설정</CardTitle>
          <Button onClick={handleEqualWeights} variant="outline" size="sm">
            균등 배분
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedQuestions.map(q => (
            <div key={q} className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">문항 {q}</label>
                <span className="text-sm text-muted-foreground">
                  {(weights[q] * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[weights[q]]}
                onValueChange={(value) => handleWeightChange(q, value)}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          ))}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">합계</span>
              <span className={`font-bold ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
                {(totalWeight * 100).toFixed(1)}%
              </span>
            </div>
            {!isWeightValid && (
              <p className="text-sm text-red-600 mt-2">
                가중치의 합이 100%가 되어야 합니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleCalculate}
          disabled={loading || !isWeightValid || selectedQuestions.length === 0}
          className="flex-1"
        >
          <Calculator className="w-4 h-4 mr-2" />
          {loading ? '계산 중...' : '점수 계산 실행'}
        </Button>
        {scores.length > 0 && (
          <Button onClick={handleCalculate} variant="outline">
            <RotateCw className="w-4 h-4 mr-2" />
            재계산
          </Button>
        )}
      </div>

      {scores.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>점수 결과 ({scores.length}명)</CardTitle>
            <Button onClick={handleDownloadCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생 코드</TableHead>
                  {selectedQuestions.map(q => (
                    <TableHead key={q}>Q{q}</TableHead>
                  ))}
                  <TableHead>총점</TableHead>
                  <TableHead>순위</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map(row => (
                  <TableRow key={row.response_id}>
                    <TableCell className="font-medium">{row.student_code}</TableCell>
                    {selectedQuestions.map(q => {
                      const scoreKey = `q${q}_score` as keyof typeof row;
                      const score = row[scoreKey];
                      return (
                        <TableCell key={q}>
                          {typeof score === 'number' ? score.toFixed(2) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="font-bold">{row.total_score.toFixed(2)}</TableCell>
                    <TableCell>{row.rank}</TableCell>
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
