import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Minus, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DecisionBarProps {
  onDecision: (decision: "left" | "right" | "neutral" | "skip") => void;
  allowTie?: boolean;
  allowSkip?: boolean;
  disabled?: boolean;
}

export const DecisionBar = ({
  onDecision,
  allowTie = true,
  allowSkip = false,
  disabled = false,
}: DecisionBarProps) => {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Hotkey hints */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="px-2 py-1 text-xs">←</Badge>
          <span>왼쪽이 더 좋음</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="px-2 py-1 text-xs">↑</Badge>
          <span>이전</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="px-2 py-1 text-xs">↓</Badge>
          <span>다음</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="px-2 py-1 text-xs">→</Badge>
          <span>오른쪽이 더 좋음</span>
        </div>
        {allowTie && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="px-1 py-0 text-xs">N</Badge>
            <span>동점</span>
          </div>
        )}
        {allowSkip && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="px-1 py-0 text-xs">S</Badge>
            <span>건너뛰기</span>
          </div>
        )}
      </div>

      {/* Decision buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="compare"
          size="xl"
          onClick={() => onDecision("left")}
          disabled={disabled}
          className="flex items-center gap-2 min-w-32"
        >
          <ChevronLeft className="h-5 w-5" />
          A가 더 좋음
        </Button>

        {allowTie && (
          <Button
            variant="decision"
            size="lg"
            onClick={() => onDecision("neutral")}
            disabled={disabled}
            className="flex items-center gap-2 min-w-24"
          >
            <Minus className="h-4 w-4" />
            동점
          </Button>
        )}

        <Button
          variant="compare"
          size="xl"
          onClick={() => onDecision("right")}
          disabled={disabled}
          className="flex items-center gap-2 min-w-32"
        >
          B가 더 좋음
          <ChevronRight className="h-5 w-5" />
        </Button>

        {allowSkip && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => onDecision("skip")}
            disabled={disabled}
            className="flex items-center gap-2 ml-4"
          >
            <SkipForward className="h-4 w-4" />
            건너뛰기
          </Button>
        )}
      </div>
    </div>
  );
};