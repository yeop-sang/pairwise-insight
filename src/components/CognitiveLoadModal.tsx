import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Brain } from 'lucide-react';

type CognitiveLoadPhase = 'initial_self_eval' | 'comparison' | 'final_self_eval';

interface CognitiveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  studentId: string;
  questionNumber: number | null;
  phase: CognitiveLoadPhase;
  onSubmitSuccess: () => void;
}

const scaleLabels: Record<number, string> = {
  1: '매우 매우 낮음',
  2: '매우 낮음',
  3: '낮음',
  4: '다소 낮음',
  5: '보통',
  6: '다소 높음',
  7: '높음',
  8: '매우 높음',
  9: '매우 매우 높음',
};

export const CognitiveLoadModal = ({
  isOpen,
  onClose,
  projectId,
  studentId,
  questionNumber,
  phase,
  onSubmitSuccess,
}: CognitiveLoadModalProps) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // phase에 따른 질문 텍스트
  const getQuestionText = () => {
    const taskType = phase === 'comparison' ? '비교평가' : '자기평가';
    return `방금 ${taskType} 과제를 수행하는 동안 얼마나 많은 정신적 노력을 기울였는가?`;
  };

  const handleSubmit = async () => {
    if (selectedScore === null) {
      toast({
        title: '점수를 선택해주세요',
        description: '1점부터 9점까지 중 하나를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('cognitive_load_measurements' as any)
        .insert({
          project_id: projectId,
          student_id: studentId,
          question_number: questionNumber,
          phase: phase,
          score: selectedScore,
        });

      if (error) throw error;

      toast({
        title: '제출 완료',
        description: '응답이 저장되었습니다.',
      });

      setSelectedScore(null);
      onSubmitSuccess();
    } catch (error: any) {
      console.error('Error submitting cognitive load measurement:', error);
      toast({
        title: '오류',
        description: '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6 text-primary" />
            인지부하 측정
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {getQuestionText()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* 9점 리커트 척도 */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`
                  w-10 h-10 rounded-lg font-semibold text-sm transition-all duration-200
                  ${selectedScore === score
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>

          {/* 레이블 표시 */}
          <div className="flex justify-between text-xs text-muted-foreground px-1 mb-4">
            <span>매우 매우 낮은<br/>정신적 노력</span>
            <span className="text-center">보통</span>
            <span className="text-right">매우 매우 높은<br/>정신적 노력</span>
          </div>

          {/* 선택된 점수 표시 */}
          {selectedScore && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">선택한 점수: </span>
              <span className="font-semibold text-foreground">{selectedScore}점</span>
              <span className="text-sm text-muted-foreground"> ({scaleLabels[selectedScore]})</span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={selectedScore === null || submitting}
            className="min-w-24"
          >
            {submitting ? '제출 중...' : '제출하기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
