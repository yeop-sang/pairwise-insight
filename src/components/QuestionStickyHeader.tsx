import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface QuestionStickyHeaderProps {
  title: string;
  promptMarkdown: string;
  rubricMarkdown?: string;
  allowTie?: boolean;
  allowSkip?: boolean;
}

export const QuestionStickyHeader = ({
  title,
  promptMarkdown,
  rubricMarkdown,
  allowTie = true,
  allowSkip = false,
}: QuestionStickyHeaderProps) => {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
            <p className="text-sm text-muted-foreground">{promptMarkdown}</p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
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
            
            {rubricMarkdown && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">평가 루브릭</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {rubricMarkdown}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};