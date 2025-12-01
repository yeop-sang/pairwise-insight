import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RubricEditor, RubricData } from './RubricEditor';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectReviewStepProps {
  questions: Record<number, string>;
  responses: Array<{ code: string; answer: string; questionIndex: number }>;
  onBack: () => void;
  onComplete: (rubrics: Record<number, RubricData>) => void;
}

export const ProjectReviewStep = ({ 
  questions, 
  responses, 
  onBack, 
  onComplete 
}: ProjectReviewStepProps) => {
  const { toast } = useToast();
  const [rubrics, setRubrics] = useState<Record<number, RubricData>>({});

  const handleRubricChange = (questionNumber: number, rubric: RubricData) => {
    setRubrics(prev => ({
      ...prev,
      [questionNumber]: rubric
    }));
  };

  const handleComplete = () => {
    const questionNumbers = Object.keys(questions).map(Number);
    const missingRubrics = questionNumbers.filter(qNum => !rubrics[qNum]);

    if (missingRubrics.length > 0) {
      toast({
        variant: 'destructive',
        title: '루브릭 미입력',
        description: `문항 ${missingRubrics.join(', ')}의 루브릭을 입력해주세요.`
      });
      return;
    }

    onComplete(rubrics);
  };

  // 문항별 응답 통계
  const getResponseStats = (questionNumber: number) => {
    const questionResponses = responses.filter(r => r.questionIndex + 1 === questionNumber);
    const nonEmptyResponses = questionResponses.filter(r => r.answer.trim());
    return {
      total: questionResponses.length,
      nonEmpty: nonEmptyResponses.length
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">프로젝트 검토 및 루브릭 설정</h2>
          <p className="text-muted-foreground">
            각 문항에 대한 평가 기준(루브릭)을 설정해주세요
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          이전
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>업로드된 데이터 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {new Set(responses.map(r => r.code)).size}
              </p>
              <p className="text-sm text-muted-foreground">학생 수</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {Object.keys(questions).length}
              </p>
              <p className="text-sm text-muted-foreground">문항 수</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {responses.length}
              </p>
              <p className="text-sm text-muted-foreground">총 응답 수</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {Object.entries(questions).map(([qNum, qText]) => {
          const questionNumber = Number(qNum);
          const stats = getResponseStats(questionNumber);
          
          return (
            <div key={qNum} className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">
                  응답: {stats.nonEmpty}/{stats.total}개 (비어있지 않은 응답)
                </h3>
                {rubrics[questionNumber] && (
                  <span className="text-xs text-green-600 font-medium">
                    ✓ 루브릭 설정 완료
                  </span>
                )}
              </div>
              <RubricEditor
                questionNumber={questionNumber}
                questionText={qText}
                rubric={rubrics[questionNumber] || null}
                onRubricChange={(rubric) => handleRubricChange(questionNumber, rubric)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          이전
        </Button>
        <Button onClick={handleComplete} size="lg">
          <Save className="h-4 w-4 mr-2" />
          프로젝트 생성 완료
        </Button>
      </div>
    </div>
  );
};
