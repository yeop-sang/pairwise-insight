import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";

export const CreateProject = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    question: "",
    rubric: ""
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "파일 형식 오류",
        description: "CSV 파일만 업로드 가능합니다."
      });
    }
  };

  const parseCSV = async (file: File): Promise<Array<{code: string, answer: string}>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row, parse data
        const data = lines.slice(1).map(line => {
          const [code, answer] = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
          return { code, answer };
        }).filter(row => row.code && row.answer);
        
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || profile?.role !== 'teacher') {
      toast({
        variant: "destructive",
        title: "권한 없음",
        description: "교사만 프로젝트를 생성할 수 있습니다."
      });
      return;
    }

    if (!csvFile) {
      toast({
        variant: "destructive",
        title: "파일 누락",
        description: "학생 응답 CSV 파일을 업로드해주세요."
      });
      return;
    }

    setLoading(true);

    try {
      // Parse CSV file
      const responses = await parseCSV(csvFile);
      
      if (responses.length === 0) {
        throw new Error("CSV 파일에 유효한 데이터가 없습니다.");
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          question: projectData.question,
          rubric: projectData.rubric,
          teacher_id: user.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert student responses
      const { error: responsesError } = await supabase
        .from('student_responses')
        .insert(
          responses.map(response => ({
            project_id: project.id,
            student_code: response.code,
            response_text: response.answer
          }))
        );

      if (responsesError) throw responsesError;

      toast({
        title: "프로젝트 생성 완료",
        description: `${responses.length}개의 학생 응답이 업로드되었습니다.`
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "프로젝트 생성 실패",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'teacher') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">접근 권한 없음</h2>
            <p className="text-muted-foreground">교사만 프로젝트를 생성할 수 있습니다.</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          대시보드로 돌아가기
        </Button>
        <h1 className="text-3xl font-bold text-foreground">새 프로젝트 생성</h1>
        <p className="text-muted-foreground mt-2">동료평가 프로젝트를 생성하고 학생 응답을 업로드하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>프로젝트 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">프로젝트 제목</Label>
              <Input
                id="title"
                value={projectData.title}
                onChange={(e) => setProjectData({...projectData, title: e.target.value})}
                placeholder="예: 영어 에세이 동료평가"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">프로젝트 설명</Label>
              <Textarea
                id="description"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="question">평가 질문</Label>
              <Textarea
                id="question"
                value={projectData.question}
                onChange={(e) => setProjectData({...projectData, question: e.target.value})}
                placeholder="학생들이 비교할 때 참고할 질문을 입력하세요"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rubric">평가 기준 (선택사항)</Label>
              <Textarea
                id="rubric"
                value={projectData.rubric}
                onChange={(e) => setProjectData({...projectData, rubric: e.target.value})}
                placeholder="평가 기준이나 루브릭을 입력하세요"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              학생 응답 업로드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV 파일</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  CSV 파일을 선택하거나 드래그하여 업로드하세요
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  형식: 1열(code), 2열(answer) - 1행은 헤더
                </p>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="max-w-sm mx-auto"
                />
              </div>
              {csvFile && (
                <p className="text-sm text-success">
                  선택된 파일: {csvFile.name}
                </p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">CSV 파일 형식 예시:</h4>
              <pre className="text-sm text-muted-foreground">
{`code,answer
1,"학생 1의 응답 내용..."
2,"학생 2의 응답 내용..."
3,"학생 3의 응답 내용..."`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "생성 중..." : "프로젝트 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
};