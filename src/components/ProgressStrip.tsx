import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle } from "lucide-react";

interface ProgressStripProps {
  completed: number;
  total: number;
  estimatedTimeRemaining?: string;
}

export const ProgressStrip = ({
  completed,
  total,
  estimatedTimeRemaining,
}: ProgressStripProps) => {
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-soft">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span>{completed}/{total} 비교 완료</span>
          </div>
          
          {estimatedTimeRemaining && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>~{estimatedTimeRemaining} 남음</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Progress value={percentage} className="flex-1" />
          <span className="text-sm font-medium text-foreground min-w-12">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};