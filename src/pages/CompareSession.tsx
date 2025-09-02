import { useState, useEffect } from "react";
import { QuestionStickyHeader } from "@/components/QuestionStickyHeader";
import { ResponseCard } from "@/components/ResponseCard";
import { DecisionBar } from "@/components/DecisionBar";
import { ProgressStrip } from "@/components/ProgressStrip";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data
const mockQuestion = {
  title: "에세이 분석: 기후 변화 해결책",
  promptMarkdown: "논증의 명확성, 증거 사용, 전반적인 설득력을 바탕으로 이 에세이들을 비교하세요. 어떤 응답이 주제를 더 잘 다루고 비판적 사고를 보여주는지 고려하세요.",
  rubricMarkdown: "우수(4): 명확한 논제, 강력한 증거, 설득력 있는 논증\n양호(3): 대체로 명확하며 일부 뒷받침 증거 있음\n보통(2): 기본적인 논증에 최소한의 증거\n부족(1): 불분명하거나 뒷받침되지 않는 논증",
  allowTie: true,
  allowSkip: false,
};

const mockResponses = [
  {
    id: "resp1",
    ownerMasked: "학생 #A47",
    contentText: "기후 변화는 우리 시대의 가장 시급한 도전 중 하나입니다. 증거는 명확합니다: 지구 온도 상승, 빙하 용해, 극한 기상 현상이 더욱 빈번해지고 있습니다. 이 위기를 해결하기 위해서는 재생 에너지 도입, 탄소 가격 책정 메커니즘, 국제 협력을 결합한 다각적 접근이 필요합니다.\n\n태양광과 풍력 같은 재생 에너지원은 화석 연료와 비교해 점점 더 경쟁력 있는 비용을 갖게 되었습니다. 덴마크와 코스타리카 같은 나라들은 경제 성장을 저해하지 않으면서도 전력의 상당 부분을 재생 에너지로 생산할 수 있음을 보여주었습니다.\n\n배출권 거래제나 탄소세를 통한 탄소 가격 책정은 기업들이 배출량을 줄이도록 하는 경제적 인센티브를 만듭니다. 유럽연합 배출권 거래제의 성공은 시장 기반 솔루션이 온실가스 배출량을 효과적으로 감소시킬 수 있음을 보여줍니다.\n\n기후 변화는 조율된 행동이 필요한 전 지구적 문제이기 때문에 국제 협력이 중요합니다. 파리 협정이 틀을 제공하지만, 더 야심찬 약속과 더 나은 집행 메커니즘이 필요합니다.",
    attachments: [
      {
        id: "att1",
        type: "file" as const,
        name: "기후_데이터_차트.pdf",
      },
    ],
  },
  {
    id: "resp2", 
    ownerMasked: "학생 #B23",
    contentText: "기후 변화는 분명히 문제이지만 기술이 결국 해결할 것이라고 생각합니다. 전기차는 점점 좋아지고 있고 태양광 패널도 더 저렴해지고 있습니다. 회사들은 탄소 포집이나 핵융합 발전 같은 새로운 기술을 개발하고 있습니다.\n\n일부 과학자들은 상황이 정말 나빠지면 지구공학을 사용해서 지구를 냉각시킬 수 있을 것이라고 생각한다고 읽었습니다. 우주에 거울을 설치하거나 대기에 뭔가를 뿌리는 것처럼요.\n\n또한 소셜 미디어와 그레타 툰베리 같은 활동가들 때문에 사람들이 지금 더 인식하고 있습니다. 특히 젊은 사람들은 환경을 중요하게 생각하고 기후 변화를 진지하게 받아들이는 정치인들에게 투표할 것입니다.\n\n청정 에너지에서 돈을 벌 수 있기 때문에 자유 시장이 결국 해결책을 찾을 것이라고 생각합니다. 뭔가가 수익성이 있게 되면, 기업들은 정부 규제 없이도 자동으로 그것을 할 것입니다.",
    attachments: [],
  },
];

export const CompareSession = () => {
  const navigate = useNavigate();
  const [currentPair, setCurrentPair] = useState({ left: mockResponses[0], right: mockResponses[1] });
  const [completed, setCompleted] = useState(1);
  const [total] = useState(25);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing in input fields
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handleDecision("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          handleDecision("right");
          break;
        case "ArrowUp":
          event.preventDefault();
          handlePrevious();
          break;
        case "ArrowDown":
          event.preventDefault();
          handleNext();
          break;
        // Keep existing letter shortcuts for accessibility
        case "a":
        case "A":
          handleDecision("left");
          break;
        case "l":
        case "L":
          handleDecision("right");
          break;
        case "n":
        case "N":
          if (mockQuestion.allowTie) {
            handleDecision("neutral");
          }
          break;
        case "s":
        case "S":
          if (mockQuestion.allowSkip) {
            handleDecision("skip");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleDecision = (decision: "left" | "right" | "neutral" | "skip") => {
    const decisionTime = Date.now() - startTime;
    console.log(`Decision: ${decision}, Time: ${decisionTime}ms`);
    
    // In real app, would submit to API here
    
    // Move to next pair
    handleNext();
  };

  const handleNext = () => {
    if (completed < total) {
      setCompleted(prev => prev + 1);
      setStartTime(Date.now());
      
      // For demo, just randomize the responses
      const shuffled = [...mockResponses].sort(() => Math.random() - 0.5);
      setCurrentPair({ left: shuffled[0], right: shuffled[1] });
    }
  };

  const handlePrevious = () => {
    if (completed > 1) {
      setCompleted(prev => prev - 1);
      setStartTime(Date.now());
      
      // For demo, just randomize the responses (in real app would load previous pair)
      const shuffled = [...mockResponses].sort(() => Math.random() - 0.5);
      setCurrentPair({ left: shuffled[0], right: shuffled[1] });
    }
  };

  const estimatedTimeRemaining = () => {
    const avgTimePerComparison = 45; // seconds
    const remaining = total - completed;
    const minutes = Math.ceil((remaining * avgTimePerComparison) / 60);
    return `${minutes} min`;
  };

  // 비교 완료 화면
  if (completed >= total) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-bold text-foreground">평가 완료!</h1>
            <p className="text-lg text-muted-foreground">
              수고하셨습니다. 모든 비교 평가를 마무리했습니다.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => {
                  setCompleted(1);
                  setStartTime(Date.now());
                  const shuffled = [...mockResponses].sort(() => Math.random() - 0.5);
                  setCurrentPair({ left: shuffled[0], right: shuffled[1] });
                }}
                className="flex items-center gap-2"
              >
                다시 평가하기
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/student-dashboard")}
                className="flex items-center gap-2"
              >
                다른 평가하러 가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <QuestionStickyHeader
        title={mockQuestion.title}
        promptMarkdown={mockQuestion.promptMarkdown}
        rubricMarkdown={mockQuestion.rubricMarkdown}
        allowTie={mockQuestion.allowTie}
        allowSkip={mockQuestion.allowSkip}
      />

      {/* Main comparison area */}
      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Action buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/student-dashboard")}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            세션 종료
          </Button>
          
          <Button
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            진행상황 저장
          </Button>
        </div>

        {/* Response comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ResponseCard
            responseId={currentPair.left.id}
            ownerMasked={currentPair.left.ownerMasked}
            contentText={currentPair.left.contentText}
            attachments={currentPair.left.attachments}
            position="left"
          />
          
          <ResponseCard
            responseId={currentPair.right.id}
            ownerMasked={currentPair.right.ownerMasked}
            contentText={currentPair.right.contentText}
            attachments={currentPair.right.attachments}
            position="right"
          />
        </div>

        {/* Decision buttons */}
        <DecisionBar
          onDecision={handleDecision}
          allowTie={mockQuestion.allowTie}
          allowSkip={mockQuestion.allowSkip}
        />
      </div>

      {/* Progress strip */}
      <ProgressStrip
        completed={completed}
        total={total}
        estimatedTimeRemaining={estimatedTimeRemaining()}
      />
    </div>
  );
};