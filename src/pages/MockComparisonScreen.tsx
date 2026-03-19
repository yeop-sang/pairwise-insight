import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Clock, Target } from "lucide-react";

const MockComparisonScreen = () => {
  const mockQuestion = "인공지능(AI)이 교육 현장에서 활용될 때 발생할 수 있는 윤리적 문제를 두 가지 이상 제시하고, 각각에 대한 해결 방안을 서술하시오.";

  const mockResponseA = `인공지능이 교육에서 활용될 때 발생할 수 있는 윤리적 문제는 크게 두 가지로 나눌 수 있습니다.

첫째, 데이터 프라이버시 문제입니다. AI 기반 학습 시스템은 학생들의 학습 패턴, 성적, 행동 데이터를 수집하고 분석합니다. 이 과정에서 학생의 개인정보가 무분별하게 수집되거나 제3자에게 유출될 위험이 있습니다. 이를 해결하기 위해서는 데이터 수집 범위를 최소화하고, 학생과 학부모의 명시적 동의를 받는 절차를 마련해야 합니다.

둘째, 알고리즘 편향성 문제입니다. AI가 특정 집단의 데이터를 기반으로 학습하면, 소수 집단의 학생들에게 불공정한 평가나 추천이 이루어질 수 있습니다. 이를 방지하기 위해 다양한 배경의 데이터를 균형 있게 포함시키고, 정기적으로 알고리즘의 공정성을 검증하는 시스템을 구축해야 합니다.`;

  const mockResponseB = `AI가 교육에 도입되면서 여러 윤리적 문제가 생길 수 있습니다.

1. 학생 감시 문제: AI가 학생의 모든 활동을 추적하면 감시 사회처럼 될 수 있습니다. 학생들이 자유롭게 사고하고 실수할 수 있는 환경이 중요한데, 과도한 모니터링은 이를 방해합니다. 해결 방안으로는 AI 모니터링의 범위와 시간을 제한하고, 수집된 데이터의 용도를 투명하게 공개하는 것이 필요합니다.

2. 교사 역할 축소: AI가 수업과 평가를 대체하면 교사의 역할이 줄어들 수 있고, 이는 교육의 인간적 측면을 약화시킬 수 있습니다. 교사는 단순 지식 전달자가 아니라 학생의 정서적 성장을 돕는 멘토입니다. AI는 보조 도구로만 활용하고 핵심 교육 활동은 교사가 담당하도록 역할을 분담해야 합니다.`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          학생 대시보드로 돌아가기
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI 윤리와 교육 프로젝트</h1>
            <p className="text-muted-foreground mt-2">
              1번 문항 (1/3) - 다음 두 응답을 비교하여 더 좋은 응답을 선택하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              5/15 완료
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>1번 문항 평가</span>
            <Badge variant="secondary">1/3</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-4">
            {mockQuestion}
          </p>
          
          {/* 진행 상황 표시 */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">개인 진행률</span>
              <span className="font-medium">33%</span>
            </div>
            <Progress value={33} className="h-2" />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>예상 남은 시간</span>
              <span>약 5분</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle>
              <span>응답 A</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {mockResponseA}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-transparent hover:border-primary/50 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>응답 B</span>
              <Badge variant="outline">학생 S1047</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg border min-h-[200px]">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {mockResponseB}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비교 선택 버튼들 */}
      <div className="mt-8 flex justify-center gap-4">
        <Button 
          size="lg"
          variant="outline"
          className="min-w-32 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          응답 A 선택
          <span className="text-xs text-muted-foreground ml-2">(←)</span>
        </Button>

        <Button 
          size="lg"
          variant="secondary"
          className="min-w-32 flex items-center gap-2"
        >
          <Minus className="h-4 w-4" />
          중립
          <span className="text-xs text-muted-foreground ml-2">(↓)</span>
        </Button>

        <Button 
          size="lg"
          variant="outline"
          className="min-w-32 flex items-center gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          응답 B 선택
          <span className="text-xs text-muted-foreground ml-2">(→)</span>
        </Button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          신중하게 비교한 후 더 우수한 응답을 선택해주세요
        </p>
      </div>
    </div>
  );
};

export default MockComparisonScreen;
