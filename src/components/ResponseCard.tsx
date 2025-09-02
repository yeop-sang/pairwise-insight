import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link, Image, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Attachment {
  id: string;
  type: "file" | "url" | "image";
  name: string;
  path?: string;
  url?: string;
}

interface ResponseCardProps {
  responseId: string;
  ownerMasked: string;
  contentText: string;
  attachments?: Attachment[];
  position: "left" | "right";
}

export const ResponseCard = ({
  responseId,
  ownerMasked,
  contentText,
  attachments = [],
  position,
}: ResponseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "url":
        return <Link className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`h-full transition-all duration-300 hover:shadow-medium ${
      position === "left" ? "mr-2" : "ml-2"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {position === "left" ? "응답 A" : "응답 B"}
            </Badge>
            <span className="text-sm text-muted-foreground">{ownerMasked}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`transition-all duration-300 ${isExpanded ? "block" : "hidden"}`}>
        <div className="space-y-4">
          {/* Content Text */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {contentText}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                첨부파일
              </h5>
              <div className="space-y-1">
                {attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => setSelectedAttachment(
                      selectedAttachment === attachment.id ? null : attachment.id
                    )}
                    className="flex items-center gap-2 w-full p-2 text-left text-xs bg-muted hover:bg-accent rounded transition-colors"
                  >
                    {getAttachmentIcon(attachment.type)}
                    <span className="truncate">{attachment.name}</span>
                  </button>
                ))}
              </div>

              {/* Attachment Preview */}
              {selectedAttachment && (
                <div className="mt-3 p-3 bg-muted/50 rounded border">
                  {/* This would show preview based on attachment type */}
                  <div className="text-xs text-muted-foreground">
                    미리보기: {attachments.find(a => a.id === selectedAttachment)?.name}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};