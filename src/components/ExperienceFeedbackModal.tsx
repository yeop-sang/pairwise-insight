import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Star, Send, Sparkles, Heart, ThumbsUp, MessageSquare } from "lucide-react";

interface ExperienceFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  studentId: string;
  onSubmitSuccess?: () => void;
}

export const ExperienceFeedbackModal = ({
  isOpen,
  onClose,
  projectId,
  studentId,
  onSubmitSuccess,
}: ExperienceFeedbackModalProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [positiveFeedback, setPositiveFeedback] = useState("");
  const [improvementFeedback, setImprovementFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "별점을 선택해주세요",
        description: "1~5개의 별 중 만족도를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("user_experience_feedback")
        .insert({
          project_id: projectId,
          student_id: studentId,
          rating,
          positive_feedback: positiveFeedback.trim() || null,
          improvement_feedback: improvementFeedback.trim() || null,
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "피드백 감사합니다! 🎉",
        description: "소중한 의견이 잘 저장되었습니다.",
      });

      setTimeout(() => {
        onSubmitSuccess?.();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "피드백 저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const ratingLabels = ["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요!"];
  const ratingEmojis = ["", "😔", "😐", "🙂", "😊", "🤩"];

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce-slow">
                <Heart className="w-12 h-12 text-white animate-pulse" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-sparkle" />
              <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-orange-400 animate-sparkle" style={{ animationDelay: "0.3s" }} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-foreground">감사합니다! 🎉</h3>
              <p className="text-muted-foreground">
                소중한 피드백이 잘 저장되었습니다.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">사용 경험을 들려주세요!</DialogTitle>
              <DialogDescription className="mt-1">
                여러분의 소중한 피드백이 서비스 개선에 큰 도움이 됩니다
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 별점 평가 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              전반적인 만족도
            </Label>
            <div className="flex flex-col items-center space-y-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="relative group transition-transform duration-200 hover:scale-125"
                  >
                    <Star
                      className={`w-10 h-10 transition-all duration-200 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-lg"
                          : "text-muted-foreground/30 hover:text-yellow-400/50"
                      }`}
                    />
                    {star <= (hoveredRating || rating) && (
                      <div className="absolute inset-0 animate-ping">
                        <Star className="w-10 h-10 text-yellow-400/30" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {(hoveredRating || rating) > 0 && (
                <div className="flex items-center gap-2 text-lg animate-fade-in">
                  <span className="text-2xl">{ratingEmojis[hoveredRating || rating]}</span>
                  <span className="font-medium text-foreground">
                    {ratingLabels[hoveredRating || rating]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 좋았던 점 */}
          <div className="space-y-2">
            <Label htmlFor="positive" className="text-base font-semibold flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-green-500" />
              어떤 점이 좋았나요?
            </Label>
            <Textarea
              id="positive"
              placeholder="예: 친구들의 답안을 비교하는 것이 재미있었어요, 평가 기준이 명확해서 좋았어요..."
              value={positiveFeedback}
              onChange={(e) => setPositiveFeedback(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {positiveFeedback.length}/500
            </p>
          </div>

          {/* 개선 필요 사항 */}
          <div className="space-y-2">
            <Label htmlFor="improvement" className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              개선이 필요한 점이 있나요?
            </Label>
            <Textarea
              id="improvement"
              placeholder="예: 화면 글씨가 조금 작았어요, 시간이 부족했어요, 더 많은 예시가 있으면 좋겠어요..."
              value={improvementFeedback}
              onChange={(e) => setImprovementFeedback(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {improvementFeedback.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1"
            disabled={isSubmitting}
          >
            건너뛰기
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                피드백 보내기
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
