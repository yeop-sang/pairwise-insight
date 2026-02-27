import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronRight } from "lucide-react";

const SCORE_LABELS = [
  { score: 1, label: "매우 부족", description: "많은 개선이 필요함" },
  { score: 2, label: "부족", description: "일부 개선이 필요함" },
  { score: 3, label: "보통", description: "기본적인 수준" },
  { score: 4, label: "좋음", description: "잘 작성됨" },
  { score: 5, label: "매우 좋음", description: "우수하게 작성됨" },
];

const MockSelfEvaluation = () => {
  const [score, setScore] = useState<number | null>(3);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  const mockQuestion = "인공지능(AI)이 교육 현장에서 활용될 때 발생할 수 있는 윤리적 문제를 두 가지 이상 제시하고, 각각에 대한 해결 방안을 서술하시오.";

  const mockMyResponse = `인공지능이 교육에 도입되면서 발생할 수 있는 윤리적 문제로 저는 두 가지를 생각했습니다.

첫 번째로, 학생 데이터의 사생활 침해 문제입니다. AI 학습 플랫폼은 학생의 학습 이력, 오답 패턴, 접속 시간 등 다양한 데이터를 수집합니다. 이러한 데이터가 적절히 보호되지 않으면 학생의 사생활이 침해될 수 있습니다. 해결 방안으로는 데이터 암호화와 접근 권한 관리를 철저히 하고, 학생과 학부모에게 데이터 수집 목적을 명확히 고지하는 것이 필요합니다.

두 번째로, AI 의존으로 인한 비판적 사고력 저하 문제입니다. AI가 모든 답을 제공해주면 학생들이 스스로 생각하는 능력이 약해질 수 있습니다. 이를 방지하기 위해 AI를 보조 도구로만 활용하고, 학생들이 직접 사고하고 토론하는 활동을 병행해야 합니다.`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" className="text-sm">
            사전 자기평가
          </Badge>
          <Badge variant="outline">
            1/3 문항
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          📝 비교 전 자기평가
        </h1>
        <p className="text-muted-foreground mt-2">
          동료 응답을 비교하기 전에, 먼저 자신의 응답을 평가해보세요.
        </p>
      </div>

      {/* 문항 표시 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📋 1번 문항</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{mockQuestion}</p>
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
              {mockMyResponse}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 점수 선택 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            ⭐ 내 응답에 몇 점을 주겠습니까?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4 mb-4">
            {SCORE_LABELS.map(({ score: s, label }) => (
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

      {/* 이유 입력 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            💭 이 점수를 준 이유 <span className="text-sm font-normal text-muted-foreground">(선택)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="해당 점수를 준 이유를 작성해주세요... (선택사항)"
            defaultValue="문제에서 요구한 두 가지 윤리적 문제를 제시했지만, 해결 방안이 좀 더 구체적이었으면 좋겠다고 생각합니다."
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <Button size="lg" className="min-w-48">
          <span className="flex items-center gap-2">
            다음 문항
            <ChevronRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
    </div>
  );
};

export default MockSelfEvaluation;
