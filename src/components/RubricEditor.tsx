import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface RubricCriterion {
  score: string;
  description: string;
}

export interface RubricData {
  type: 'table' | 'image';
  criteria?: RubricCriterion[];
  imageUrl?: string;
}

interface RubricEditorProps {
  questionNumber: number;
  questionText: string;
  rubric: RubricData | null;
  onRubricChange: (rubric: RubricData) => void;
}

export const RubricEditor = ({ 
  questionNumber, 
  questionText, 
  rubric, 
  onRubricChange 
}: RubricEditorProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'table' | 'image'>(rubric?.type || 'table');
  const [criteria, setCriteria] = useState<RubricCriterion[]>(
    rubric?.type === 'table' && rubric.criteria 
      ? rubric.criteria 
      : [{ score: '3점', description: '' }, { score: '2점', description: '' }, { score: '1점', description: '' }]
  );
  const [imageUrl, setImageUrl] = useState(rubric?.type === 'image' ? rubric.imageUrl : '');

  const handleAddCriterion = () => {
    setCriteria([...criteria, { score: '', description: '' }]);
  };

  const handleRemoveCriterion = (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    setCriteria(newCriteria);
  };

  const handleCriterionChange = (index: number, field: 'score' | 'description', value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index][field] = value;
    setCriteria(newCriteria);
  };

  const handleSaveTable = () => {
    if (criteria.some(c => !c.score || !c.description)) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '모든 점수와 수행 특성을 입력해주세요.'
      });
      return;
    }

    onRubricChange({
      type: 'table',
      criteria
    });

    toast({
      title: '저장 완료',
      description: '루브릭이 저장되었습니다.'
    });
  };

  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImageUrl(dataUrl);
            onRubricChange({
              type: 'image',
              imageUrl: dataUrl
            });
            toast({
              title: '이미지 추가 완료',
              description: '루브릭 이미지가 추가되었습니다.'
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        onRubricChange({
          type: 'image',
          imageUrl: dataUrl
        });
        toast({
          title: '이미지 업로드 완료',
          description: '루브릭 이미지가 업로드되었습니다.'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          문항 {questionNumber}: {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'image')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">표 형식 입력</TabsTrigger>
            <TabsTrigger value="image">이미지 업로드</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            <div className="space-y-3">
              {criteria.map((criterion, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-none w-24">
                    <Input
                      placeholder="점수"
                      value={criterion.score}
                      onChange={(e) => handleCriterionChange(index, 'score', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder="수행 특성 설명"
                      value={criterion.description}
                      onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCriterion(index)}
                    disabled={criteria.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCriterion}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                기준 추가
              </Button>
              <Button
                type="button"
                onClick={handleSaveTable}
                className="flex-1"
              >
                저장
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onPaste={handleImagePaste}
            >
              {imageUrl ? (
                <div className="space-y-4">
                  <img src={imageUrl} alt="루브릭" className="max-h-96 mx-auto rounded-lg" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImageUrl('');
                      onRubricChange({ type: 'image', imageUrl: '' });
                    }}
                  >
                    이미지 제거
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium mb-2">
                      이미지를 여기에 붙여넣기 (Ctrl+V)
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      또는 파일을 선택해주세요
                    </p>
                    <Label htmlFor={`image-upload-${questionNumber}`}>
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          파일 선택
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id={`image-upload-${questionNumber}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
