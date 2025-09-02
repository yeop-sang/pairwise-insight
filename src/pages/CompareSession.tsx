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
  title: "Essay Analysis: Climate Change Solutions",
  promptMarkdown: "Compare these essays based on clarity of argument, use of evidence, and overall persuasiveness. Consider which response better addresses the prompt and demonstrates critical thinking.",
  rubricMarkdown: "Excellent (4): Clear thesis, strong evidence, compelling argument\nGood (3): Mostly clear with some supporting evidence\nFair (2): Basic argument with minimal evidence\nPoor (1): Unclear or unsupported argument",
  allowTie: true,
  allowSkip: false,
};

const mockResponses = [
  {
    id: "resp1",
    ownerMasked: "Student #A47",
    contentText: "Climate change represents one of the most pressing challenges of our time. The evidence is clear: rising global temperatures, melting ice caps, and extreme weather events are becoming more frequent. To address this crisis, we need a multi-faceted approach that combines renewable energy adoption, carbon pricing mechanisms, and international cooperation.\n\nRenewable energy sources like solar and wind power have become increasingly cost-competitive with fossil fuels. Countries like Denmark and Costa Rica have demonstrated that it's possible to generate significant portions of their electricity from renewables without compromising economic growth.\n\nCarbon pricing, through cap-and-trade systems or carbon taxes, creates economic incentives for businesses to reduce emissions. The success of the European Union's Emissions Trading System shows that market-based solutions can effectively drive down greenhouse gas emissions.\n\nInternational cooperation is crucial because climate change is a global problem that requires coordinated action. The Paris Agreement provides a framework, but more ambitious commitments and better enforcement mechanisms are needed.",
    attachments: [
      {
        id: "att1",
        type: "file" as const,
        name: "climate_data_charts.pdf",
      },
    ],
  },
  {
    id: "resp2", 
    ownerMasked: "Student #B23",
    contentText: "Climate change is definitely a problem but I think technology will solve it eventually. Electric cars are getting better and solar panels are cheaper now. Companies are working on new technologies like carbon capture and fusion power.\n\nI read that some scientists think we might be able to use geoengineering to cool the planet if things get really bad. Like putting mirrors in space or spraying stuff in the atmosphere.\n\nAlso people are more aware now because of social media and activists like Greta Thunberg. Young people especially care about the environment and they will vote for politicians who take climate change seriously.\n\nI think the free market will eventually figure out solutions because there's money to be made in clean energy. When something becomes profitable, businesses will do it automatically without needing government regulations.",
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
    } else {
      // Session complete
      navigate("/results");
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
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Exit Session
          </Button>
          
          <Button
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Progress
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