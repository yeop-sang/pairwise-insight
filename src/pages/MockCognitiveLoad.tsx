import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

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

const MockCognitiveLoad = () => {
  const [selectedScore, setSelectedScore] = useState<number | null>(6);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl border">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-foreground mb-2">
              <Brain className="h-6 w-6 text-primary" />
              인지부하 측정
            </div>
            <p className="text-base text-muted-foreground">
              방금 비교평가 과제를 수행하는 동안 얼마나 많은 정신적 노력을 기울였는가?
            </p>
          </div>

          {/* 9점 리커트 척도 */}
          <div className="py-6">
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
            <Button className="min-w-24">
              제출하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockCognitiveLoad;
