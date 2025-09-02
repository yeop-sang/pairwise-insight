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
import * as XLSX from 'xlsx';

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
    if (file) {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['csv', 'xlsx', 'xls'];
      
      if (allowedExtensions.includes(fileExtension || '')) {
        setCsvFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "파일 형식 오류",
          description: "CSV 또는 엑셀 파일만 업로드 가능합니다."
        });
      }
    }
  };

  const parseFile = async (file: File): Promise<Array<{code: string, answer: string, questionIndex: number}>> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'csv') {
        // CSV 파싱
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
            return;
          }
          
          const headerCells = lines[0].split(',').map(cell => cell.trim().replace(/"/g, ''));
          const questions = headerCells.slice(1);
          
          if (questions.length === 0) {
            reject(new Error("문항이 없습니다. 2열부터 문항을 입력해주세요."));
            return;
          }
          
          const data: Array<{code: string, answer: string, questionIndex: number}> = [];
          
          for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
            const studentCode = cells[0];
            
            if (!studentCode) continue;
            
            for (let j = 1; j < cells.length && j - 1 < questions.length; j++) {
              const answer = cells[j];
              if (answer && answer.trim()) {
                data.push({
                  code: studentCode,
                  answer: answer,
                  questionIndex: j - 1
                });
              }
            }
          }
          
          if (data.length === 0) {
            reject(new Error("유효한 학생 응답이 없습니다."));
            return;
          }
          
          resolve(data);
        };
        reader.onerror = reject;
        reader.readAsText(file);
        
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // 엑셀 파싱
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 엑셀을 JSON으로 변환 (헤더 포함)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (jsonData.length < 2) {
              reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
              return;
            }
            
            const headerRow = jsonData[0];
            const questions = headerRow.slice(1); // 첫 번째 열(학생번호) 제외
            
            if (questions.length === 0) {
              reject(new Error("문항이 없습니다. 2열부터 문항을 입력해주세요."));
              return;
            }
            
            const data: Array<{code: string, answer: string, questionIndex: number}> = [];
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              const studentCode = row[0]?.toString();
              
              if (!studentCode) continue;
              
              for (let j = 1; j < row.length && j - 1 < questions.length; j++) {
                const answer = row[j]?.toString();
                if (answer && answer.trim()) {
                  data.push({
                    code: studentCode,
                    answer: answer,
                    questionIndex: j - 1
                  });
                }
              }
            }
            
            if (data.length === 0) {
              reject(new Error("유효한 학생 응답이 없습니다."));
              return;
            }
            
            resolve(data);
          } catch (error) {
            reject(new Error("엑셀 파일 파싱에 실패했습니다."));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
        
      } else {
        reject(new Error("지원하지 않는 파일 형식입니다."));
      }
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
        description: "학생 응답 파일을 업로드해주세요."
      });
      return;
    }

    setLoading(true);

    try {
      // Parse file (CSV or Excel)
      const responses = await parseFile(csvFile);
      
      if (responses.length === 0) {
        throw new Error("파일에 유효한 데이터가 없습니다.");
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
            response_text: response.answer,
            question_number: response.questionIndex + 1 // 1-based indexing
          }))
        );

      if (responsesError) throw responsesError;

      // Assign all students to this project
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      if (students && students.length > 0) {
        const { error: assignmentError } = await supabase
          .from('project_assignments')
          .insert(
            students.map(student => ({
              project_id: project.id,
              student_id: student.user_id
            }))
          );

        if (assignmentError) throw assignmentError;
      }

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
              <Label htmlFor="file">파일 업로드</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  CSV 또는 엑셀 파일을 선택하거나 드래그하여 업로드하세요
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  지원 형식: .csv, .xlsx, .xls | 형식: 1열(학생번호), 2열부터(문항들)
                </p>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
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
              <h4 className="font-medium mb-2">파일 형식 예시:</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">CSV 형식:</p>
                  <pre className="text-xs text-muted-foreground bg-background p-2 rounded border">
{`학생번호,1번문항,2번문항,3번문항
1,"1번 학생의 1번 응답","1번 학생의 2번 응답","1번 학생의 3번 응답"
2,"2번 학생의 1번 응답","2번 학생의 2번 응답","2번 학생의 3번 응답"`}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">엑셀 형식:</p>
                  <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                    <div className="grid grid-cols-4 gap-1 font-mono">
                      <div className="font-bold">A1: 학생번호</div>
                      <div className="font-bold">B1: 1번문항</div>
                      <div className="font-bold">C1: 2번문항</div>
                      <div className="font-bold">D1: 3번문항</div>
                      <div>A2: 1</div>
                      <div>B2: 1번 학생의 1번 응답</div>
                      <div>C2: 1번 학생의 2번 응답</div>
                      <div>D2: 1번 학생의 3번 응답</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * 1행: 1열은 "학생번호", 2열부터는 각 문항명<br/>
                * 2행부터: 1열은 학생 식별번호, 2열부터는 해당 문항에 대한 학생 응답
              </p>
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