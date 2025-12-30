import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Star, ChevronRight, AlertCircle } from "lucide-react";

interface SelfEvaluationStepProps {
  projectId: string;
  studentId: string;
  questionNumber: number;
  totalQuestions: number;
  phase: 'pre' | 'post';
  myResponse: string;
  questionText: string;
  preScore?: number;
  preReason?: string;
  onComplete: () => void;
}

const SCORE_LABELS = [
  { score: 1, label: "매우 부족", description: "많은 개선이 필요함" },
  { score: 2, label: "부족", description: "일부 개선이 필요함" },
  { score: 3, label: "보통", description: "기본적인 수준" },
  { score: 4, label: "좋음", description: "잘 작성됨" },
  { score: 5, label: "매우 좋음", description: "우수하게 작성됨" },
];

export const SelfEvaluationStep = ({
  projectId,
  studentId,
  questionNumber,
  totalQuestions,
  phase,
  myResponse,
  questionText,
  preScore,
  preReason,
  onComplete,
}: SelfEvaluationStepProps) => {
  const { toast } = useToast();
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  // 문항이 바뀔 때 상태 초기화
  useEffect(() => {
    // 사후평가일 경우 사전 점수를 기본값으로 설정, 아니면 null
    setScore(phase === 'post' ? preScore || null : null);
    setReason("");
    setChangeReason("");
    setHoveredScore(null);
  }, [questionNumber, phase, preScore]);

  const scoreChanged = phase === 'post' && preScore !== undefined && score !== null && score !== preScore;

  const handleSubmit = async () => {
    if (score === null) {
      toast({
        variant: "destructive",
        title: "점수를 선택해주세요",
        description: "1점부터 5점 사이에서 점수를 선택해주세요.",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "이유를 입력해주세요",
        description: "해당 점수를 준 이유를 작성해주세요.",
      });
      return;
    }

    if (phase === 'post' && scoreChanged && !changeReason.trim()) {
      toast({
        variant: "destructive",
        title: "변경 이유를 입력해주세요",
        description: "점수를 변경한 이유를 작성해주세요.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Use raw query since self_evaluations table is not in generated types yet
      const { error } = await supabase
        .from('self_evaluations' as any)
        .upsert({
          project_id: projectId,
          student_id: studentId,
          question_number: questionNumber,
          phase,
          score,
          reason: reason.trim(),
          score_changed: scoreChanged,
          change_reason: scoreChanged ? changeReason.trim() : null,
        }, {
          onConflict: 'project_id,student_id,question_number,phase'
        });

      if (error) throw error;

      toast({
        title: "저장 완료",
        description: `${questionNumber}번 문항 ${phase === 'pre' ? '사전' : '사후'} 자기평가가 저장되었습니다.`,
      });

      onComplete();
    } catch (error: any) {
      console.error('Error saving self evaluation:', error);
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error.message || "자기평가 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" className="text-sm">
            {phase === 'pre' ? '사전 자기평가' : '사후 자기평가'}
          </Badge>
          <Badge variant="outline">
            {questionNumber}/{totalQuestions} 문항
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {phase === 'pre' ? '📝 비교 전 자기평가' : '🔄 비교 후 자기평가'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {phase === 'pre' 
            ? '동료 응답을 비교하기 전에, 먼저 자신의 응답을 평가해보세요.'
            : '동료 응답들을 비교한 후, 다시 자신의 응답을 평가해보세요.'}
        </p>
      </div>

      {/* 문항 표시 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📋 {questionNumber}번 문항</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{questionText}</p>
        </CardContent>
      </Card>

      {/* 내 응답 표시 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📄 나의 응답
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {myResponse || "(응답이 없습니다)"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 사후평가 시 사전 점수 표시 */}
      {phase === 'post' && preScore !== undefined && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">사전 평가 점수:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${s <= preScore ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
              <span className="font-semibold text-foreground">{preScore}점</span>
              <span className="text-xs text-muted-foreground">
                ({SCORE_LABELS[preScore - 1]?.label})
              </span>
            </div>
            {preReason && (
              <p className="text-sm text-muted-foreground mt-2 pl-1">
                이유: "{preReason}"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 점수 선택 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            ⭐ {phase === 'post' ? '다시 평가한다면 몇 점을 주겠습니까?' : '내 응답에 몇 점을 주겠습니까?'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4 mb-4">
            {SCORE_LABELS.map(({ score: s, label, description }) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                onMouseEnter={() => setHoveredScore(s)}
                onMouseLeave={() => setHoveredScore(null)}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 min-w-[80px] ${
                  score === s
                    ? 'border-primary bg-primary/10 shadow-md'
                    : hoveredScore === s
                    ? 'border-primary/50 bg-muted/50'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-0.5 mb-2">
                  {[...Array(s)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        score === s || hoveredScore === s
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-foreground">{s}점</span>
                <span className="text-xs text-muted-foreground mt-1">{label}</span>
              </button>
            ))}
          </div>
          {(score || hoveredScore) && (
            <p className="text-center text-sm text-muted-foreground">
              {SCORE_LABELS[(hoveredScore || score || 1) - 1]?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 점수 변경 알림 (사후평가에서 점수가 변경된 경우) */}
      {phase === 'post' && scoreChanged && (
        <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                점수가 변경되었습니다 ({preScore}점 → {score}점)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이유 입력 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            💭 {phase === 'post' ? '이 점수를 준 이유' : '이 점수를 준 이유'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="해당 점수를 준 이유를 작성해주세요..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      {/* 점수 변경 이유 (사후평가에서 점수가 변경된 경우) */}
      {phase === 'post' && scoreChanged && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              🔄 점수를 바꾼 이유
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="동료 응답을 비교한 후 점수를 변경한 이유를 작성해주세요..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              예: "다른 친구들의 응답을 보고 내 응답이 생각보다 더 잘 작성되었다는 것을 알게 되었습니다."
            </p>
          </CardContent>
        </Card>
      )}

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || score === null}
          className="min-w-48"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              저장 중...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {questionNumber < totalQuestions ? '다음 문항' : phase === 'pre' ? '비교 시작하기' : '완료'}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
