import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RubricDisplay } from './RubricDisplay';
import { RubricData } from './RubricEditor';

interface QuestionStickyHeaderProps {
  title: string;
  promptMarkdown: string;
  rubricData?: RubricData | null;
  questionNumber?: number;
  allowTie?: boolean;
  allowSkip?: boolean;
}

export const QuestionStickyHeader = ({
  title,
  promptMarkdown,
  rubricData,
  questionNumber,
  allowTie = true,
  allowSkip = false,
}: QuestionStickyHeaderProps) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b mb-4">
      <Card className="border-0 rounded-none shadow-md">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-bold flex-1">{title}</h2>
            <div className="flex gap-2">
              {allowTie && (
                <Badge variant="secondary" className="text-xs">
                  동점 허용
                </Badge>
              )}
              {allowSkip && (
                <Badge variant="outline" className="text-xs">
                  건너뛰기 허용
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap mb-3">
            {promptMarkdown}
          </p>
          {rubricData && questionNumber && (
            <RubricDisplay 
              questionNumber={questionNumber} 
              rubric={rubricData} 
            />
          )}
        </div>
      </Card>
    </div>
  );
};