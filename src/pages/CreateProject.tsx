import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, ArrowLeft, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { ProjectReviewStep } from "@/components/ProjectReviewStep";

export const CreateProject = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'upload' | 'review'>('info');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [parsedData, setParsedData] = useState<{
    responses: Array<{code: string, answer: string, questionIndex: number}>,
    questions: Record<number, string>
  } | null>(null);

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

  const parseCSVToRows = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          currentField = '';
        }
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
      } else {
        currentField += char;
      }
    }
    
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  };

  const parseFile = async (file: File): Promise<{
    responses: Array<{code: string, answer: string, questionIndex: number}>,
    questions: Record<number, string>
  }> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const rows = parseCSVToRows(text);
          
          if (rows.length < 2) {
            reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
            return;
          }
          
          const headerCells = rows[0];
          const numColumns = headerCells.length;
          
          const questions: Record<number, string> = {};
          for (let j = 1; j < headerCells.length; j++) {
            const questionText = headerCells[j]?.trim() || `문항 ${j}`;
            questions[j] = questionText;
          }
          
          if (numColumns < 2) {
            reject(new Error("최소 2개의 컬럼(학생번호 + 응답)이 필요합니다."));
            return;
          }
          
          const data: Array<{code: string, answer: string, questionIndex: number}> = [];
          
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i];
            const rawStudentCode = cells[0];
            const studentCode = rawStudentCode?.toString()?.trim();
            
            if (!studentCode) continue;
            
            for (let j = 1; j < cells.length; j++) {
              const rawAnswer = cells[j];
              const answer = rawAnswer?.toString()?.trim() || "";
              
              data.push({
                code: studentCode,
                answer: answer,
                questionIndex: j - 1
              });
            }
          }
          
          if (data.length === 0) {
            reject(new Error("유효한 학생 응답이 없습니다."));
            return;
          }
          
          resolve({ responses: data, questions });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
        
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (jsonData.length < 2) {
              reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
              return;
            }
            
            const headerRow = jsonData[0];
            const numColumns = headerRow.length;
            
            if (numColumns < 2) {
              reject(new Error("최소 2개의 컬럼(학생번호 + 응답)이 필요합니다."));
              return;
            }
            
            const questions: Record<number, string> = {};
            for (let j = 1; j < headerRow.length; j++) {
              const questionText = headerRow[j]?.toString()?.trim() || `문항 ${j}`;
              questions[j] = questionText;
            }
            
            const data: Array<{code: string, answer: string, questionIndex: number}> = [];
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length === 0) continue;
              
              const rawStudentCode = row[0];
              let studentCode = "";
              if (rawStudentCode !== null && rawStudentCode !== undefined) {
                studentCode = rawStudentCode.toString().trim();
              }
              
              if (!studentCode) continue;
              
              for (let j = 1; j < row.length; j++) {
                const rawAnswer = row[j];
                let answer = "";
                if (rawAnswer !== null && rawAnswer !== undefined) {
                  answer = rawAnswer.toString().trim();
                }
                
                data.push({
                  code: studentCode,
                  answer: answer,
                  questionIndex: j - 1
                });
              }
            }
            
            if (data.length === 0) {
              reject(new Error("유효한 학생 응답이 없습니다."));
              return;
            }
            
            resolve({ responses: data, questions });
          } catch (error) {
            reject(new Error(`엑셀 파일 파싱에 실패했습니다: ${error}`));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
        
      } else {
        reject(new Error("지원하지 않는 파일 형식입니다."));
      }
    });
  };

  const handleFileUpload = async () => {
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
      const { responses, questions } = await parseFile(csvFile);
      
      if (responses.length === 0) {
        throw new Error("파일에 유효한 데이터가 없습니다.");
      }

      const validationErrors = [];
      const studentCodes = new Set();
      const responseMap = new Map<string, {code: string, answer: string, questionIndex: number, rowNumber: number}>();
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        if (!response.code) {
          validationErrors.push(`데이터 ${i + 1}번째: 빈 학생번호가 있습니다.`);
          continue;
        }
        
        const key = `${response.code}-${response.questionIndex}`;
        
        if (responseMap.has(key)) {
          const existing = responseMap.get(key)!;
          if (!existing.answer && response.answer) {
            responseMap.set(key, {...response, rowNumber: i + 1});
          }
        } else {
          responseMap.set(key, {...response, rowNumber: i + 1});
        }
        
        studentCodes.add(response.code);
      }
      
      const deduplicatedResponses = Array.from(responseMap.values()).map(({rowNumber, ...response}) => response);
      
      if (validationErrors.length > 0) {
        throw new Error(`데이터 검증 실패:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? '\n...' : ''}`);
      }

      setParsedData({
        responses: deduplicatedResponses,
        questions
      });
      setStep('review');

      toast({
        title: "파일 업로드 완료",
        description: "다음 단계에서 루브릭을 설정해주세요."
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "파일 업로드 실패",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectComplete = async (rubrics: Record<number, any>) => {
    if (!user || !parsedData) return;

    setLoading(true);
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTitle || `프로젝트 ${new Date().toLocaleDateString()}`,
          description: projectDescription || null,
          question: JSON.stringify(parsedData.questions),
          rubric: JSON.stringify(rubrics),
          teacher_id: user.id
        })
        .select()
        .single();

      if (projectError) {
        throw new Error(`프로젝트 생성 실패: ${projectError.message}`);
      }

      const batchSize = 100;
      const responseBatches = [];
      
      for (let i = 0; i < parsedData.responses.length; i += batchSize) {
        responseBatches.push(parsedData.responses.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < responseBatches.length; i++) {
        const batch = responseBatches[i];
        const { error: responsesError } = await supabase
          .from('student_responses')
          .insert(
            batch.map(response => ({
              project_id: project.id,
              student_id: null,
              student_code: response.code,
              response_text: response.answer,
              question_number: response.questionIndex + 1
            }))
          );

        if (responsesError) {
          throw new Error(`학생 응답 삽입 실패 (배치 ${i + 1}): ${responsesError.message}`);
        }
      }

      toast({
        title: "프로젝트 생성 완료",
        description: `${parsedData.responses.length}개의 학생 응답이 업로드되었습니다.`
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">접근 권한 없음</h2>
            <p className="text-muted-foreground mb-4">교사만 프로젝트를 생성할 수 있습니다.</p>
            <Button onClick={() => navigate("/dashboard")}>
              대시보드로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step indicators
  const steps = [
    { key: 'info', label: '프로젝트 정보', completed: step !== 'info' },
    { key: 'upload', label: '파일 업로드', completed: step === 'review' },
    { key: 'review', label: '루브릭 설정', completed: false },
  ];

  if (step === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-4 py-8 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  step === s.key 
                    ? 'bg-primary text-primary-foreground' 
                    : s.completed 
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {s.completed ? <CheckCircle className="w-4 h-4" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${s.completed ? 'bg-primary' : 'bg-border'}`}></div>
                )}
              </div>
            ))}
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">프로젝트 정보 입력</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project-title" className="text-base">프로젝트 이름 *</Label>
                <Input
                  id="project-title"
                  placeholder="예: 2024년 1학기 논술 평가"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="h-12 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-base">프로젝트 설명</Label>
                <textarea
                  id="project-description"
                  className="w-full min-h-[120px] p-4 border border-border rounded-lg resize-none bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="프로젝트에 대한 설명을 입력하세요 (선택사항)"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              <Button 
                onClick={() => {
                  if (!projectTitle.trim()) {
                    toast({
                      variant: "destructive",
                      title: "입력 오류",
                      description: "프로젝트 이름을 입력해주세요."
                    });
                    return;
                  }
                  setStep('upload');
                }}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 group"
              >
                다음 단계로
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'review' && parsedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <ProjectReviewStep
            questions={parsedData.questions}
            responses={parsedData.responses}
            onBack={() => setStep('upload')}
            onComplete={handleProjectComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => setStep('info')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          이전 단계로
        </Button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                step === s.key 
                  ? 'bg-primary text-primary-foreground' 
                  : s.completed 
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {s.completed ? <CheckCircle className="w-4 h-4" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${s.completed ? 'bg-primary' : 'bg-border'}`}></div>
              )}
            </div>
          ))}
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl animate-slide-up">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-2xl">학생 응답 파일 업로드</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${
                csvFile ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {csvFile ? csvFile.name : 'CSV 또는 엑셀 파일을 선택하세요'}
                </p>
                <p className="text-sm text-muted-foreground">
                  첫 번째 열: 학생번호 | 나머지 열: 각 문항 응답
                </p>
              </div>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {!csvFile && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
              )}
            </div>

            <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
              <p className="text-sm font-medium mb-3">파일 형식 안내</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  첫 번째 행은 헤더 (학생번호, 문항1, 문항2, ...)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  첫 번째 열에는 각 학생의 고유 번호
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  나머지 열에는 각 문항에 대한 학생의 응답
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  CSV 또는 엑셀 파일 형식 (.csv, .xlsx, .xls)
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleFileUpload} 
              disabled={loading || !csvFile} 
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                  업로드 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  다음: 루브릭 설정
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
