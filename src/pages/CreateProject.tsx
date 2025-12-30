import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, ArrowLeft, Sparkles, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import * as XLSX from 'xlsx';
import { ProjectReviewStep } from "@/components/ProjectReviewStep";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedResponse {
  code: string;
  answer: string;
  questionIndex: number;
  studentId: string | null;
  grade: number;
  classNumber: number;
  studentNumber: number;
  name: string;
  matched: boolean;
}

interface MatchResult {
  total: number;
  matched: number;
  unmatched: string[];
}

interface ParsedData {
  responses: ParsedResponse[];
  questions: Record<number, string>;
  matchResult: MatchResult | null;
}

export const CreateProject = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'upload' | 'review'>('info');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

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

  const parseRowData = (rows: any[][]): {
    responses: Omit<ParsedResponse, 'studentId' | 'matched'>[];
    questions: Record<number, string>;
  } => {
    if (rows.length < 2) {
      throw new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다.");
    }

    const headerRow = rows[0];
    const expectedHeaders = ['학년', '반', '번호', '이름'];
    
    // Validate first 4 columns
    for (let i = 0; i < 4; i++) {
      const headerValue = headerRow[i]?.toString().trim();
      if (headerValue !== expectedHeaders[i]) {
        throw new Error(`첫 번째 행의 ${i + 1}번째 열은 "${expectedHeaders[i]}"이어야 합니다. (현재: "${headerValue || '없음'}")`);
      }
    }

    if (headerRow.length < 5) {
      throw new Error("최소 5개의 컬럼(학년, 반, 번호, 이름, 문항1)이 필요합니다.");
    }

    // Extract questions from 5th column onwards
    const questions: Record<number, string> = {};
    for (let j = 4; j < headerRow.length; j++) {
      const questionText = headerRow[j]?.toString()?.trim() || `문항 ${j - 3}`;
      questions[j - 3] = questionText;
    }

    const data: Omit<ParsedResponse, 'studentId' | 'matched'>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const gradeRaw = row[0];
      const classRaw = row[1];
      const numberRaw = row[2];
      const nameRaw = row[3];

      const grade = parseInt(gradeRaw?.toString() || '0');
      const classNumber = parseInt(classRaw?.toString() || '0');
      const studentNumber = parseInt(numberRaw?.toString() || '0');
      const name = nameRaw?.toString().trim() || '';

      if (!grade || !classNumber || !studentNumber || !name) continue;

      // Generate student code: grade + class(2 digits) + number(2 digits)
      const code = `${grade}${classNumber.toString().padStart(2, '0')}${studentNumber.toString().padStart(2, '0')}`;

      // Extract answers from 5th column onwards
      for (let j = 4; j < row.length; j++) {
        const rawAnswer = row[j];
        const answer = rawAnswer?.toString()?.trim() || "";
        
        data.push({
          code,
          grade,
          classNumber,
          studentNumber,
          name,
          answer,
          questionIndex: j - 4 // 0-indexed
        });
      }
    }

    if (data.length === 0) {
      throw new Error("유효한 학생 응답이 없습니다.");
    }

    return { responses: data, questions };
  };

  const parseFile = async (file: File): Promise<{
    responses: Omit<ParsedResponse, 'studentId' | 'matched'>[];
    questions: Record<number, string>;
  }> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const rows = parseCSVToRows(text);
            const result = parseRowData(rows);
            resolve(result);
          } catch (error: any) {
            reject(error);
          }
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
            const result = parseRowData(jsonData);
            resolve(result);
          } catch (error: any) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
        
      } else {
        reject(new Error("지원하지 않는 파일 형식입니다."));
      }
    });
  };

  const matchStudentsWithResponses = async (
    responses: Omit<ParsedResponse, 'studentId' | 'matched'>[]
  ): Promise<{ responses: ParsedResponse[]; matchResult: MatchResult }> => {
    if (!user) {
      throw new Error("사용자 인증이 필요합니다.");
    }

    // Fetch teacher's students
    const { data: students, error } = await supabase
      .from('students')
      .select('id, grade, class_number, student_number, name')
      .eq('teacher_id', user.id);

    if (error) {
      throw new Error(`학생 목록 조회 실패: ${error.message}`);
    }

    // Create matching map: grade-class-number -> { id, name }
    const studentMap = new Map<string, { id: string; name: string }>();
    students?.forEach(s => {
      const key = `${s.grade}-${s.class_number}-${s.student_number}`;
      studentMap.set(key, { id: s.id, name: s.name });
    });

    // Match responses with students
    let matchedCount = 0;
    const unmatchedNames: string[] = [];
    const processedStudents = new Set<string>();

    const matchedResponses: ParsedResponse[] = responses.map(r => {
      const key = `${r.grade}-${r.classNumber}-${r.studentNumber}`;
      const student = studentMap.get(key);

      if (student) {
        // Name mismatch warning (optional)
        if (student.name !== r.name) {
          console.warn(`이름 불일치: 파일(${r.name}) vs DB(${student.name}) - ${key}`);
        }

        if (!processedStudents.has(key)) {
          matchedCount++;
          processedStudents.add(key);
        }

        return { ...r, studentId: student.id, matched: true };
      } else {
        if (!processedStudents.has(key)) {
          unmatchedNames.push(`${r.grade}학년 ${r.classNumber}반 ${r.studentNumber}번 ${r.name}`);
          processedStudents.add(key);
        }
        return { ...r, studentId: null, matched: false };
      }
    });

    return {
      responses: matchedResponses,
      matchResult: {
        total: processedStudents.size,
        matched: matchedCount,
        unmatched: unmatchedNames
      }
    };
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
      // Parse file
      const { responses, questions } = await parseFile(csvFile);
      
      if (responses.length === 0) {
        throw new Error("파일에 유효한 데이터가 없습니다.");
      }

      // Match students
      const { responses: matchedResponses, matchResult } = await matchStudentsWithResponses(responses);

      // Validation and deduplication
      const responseMap = new Map<string, ParsedResponse & { rowNumber: number }>();
      
      for (let i = 0; i < matchedResponses.length; i++) {
        const response = matchedResponses[i];
        const key = `${response.code}-${response.questionIndex}`;
        
        if (responseMap.has(key)) {
          const existing = responseMap.get(key)!;
          if (!existing.answer && response.answer) {
            responseMap.set(key, { ...response, rowNumber: i + 1 });
          }
        } else {
          responseMap.set(key, { ...response, rowNumber: i + 1 });
        }
      }
      
      const deduplicatedResponses = Array.from(responseMap.values()).map(({ rowNumber, ...response }) => response);

      // Show matching result
      if (matchResult.unmatched.length > 0) {
        toast({
          variant: "default",
          title: `학생 매칭 결과: ${matchResult.matched}/${matchResult.total}명 성공`,
          description: `${matchResult.unmatched.length}명의 학생이 학생 관리에 등록되어 있지 않습니다. 해당 학생의 응답은 저장되지만 자기평가에서 조회할 수 없습니다.`,
        });
      } else {
        toast({
          title: "학생 매칭 완료",
          description: `모든 학생(${matchResult.matched}명)이 성공적으로 매칭되었습니다.`
        });
      }

      setParsedData({
        responses: deduplicatedResponses,
        questions,
        matchResult
      });
      setStep('review');

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
              student_id: response.studentId, // Now includes matched UUID or null
              student_code: response.code,
              response_text: response.answer,
              question_number: response.questionIndex + 1
            }))
          );

        if (responsesError) {
          throw new Error(`학생 응답 삽입 실패 (배치 ${i + 1}): ${responsesError.message}`);
        }
      }

      const matchedCount = parsedData.matchResult?.matched || 0;
      const totalCount = parsedData.matchResult?.total || 0;

      toast({
        title: "프로젝트 생성 완료",
        description: `${parsedData.responses.length}개의 응답이 업로드되었습니다. (학생 매칭: ${matchedCount}/${totalCount}명)`
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
                className="w-full h-12 text-base gap-2"
              >
                다음 단계
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
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
            이전 단계
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
              <Alert className="bg-primary/5 border-primary/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>중요:</strong> 파일의 첫 4열은 반드시 <strong>학년, 반, 번호, 이름</strong> 순서여야 합니다. 
                  학생 관리에 등록된 학생과 자동으로 매칭됩니다.
                </AlertDescription>
              </Alert>

              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  csvFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="csv-upload" className="cursor-pointer block">
                  <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    csvFile ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <FileSpreadsheet className={`w-8 h-8 ${csvFile ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  {csvFile ? (
                    <div>
                      <p className="font-medium text-lg">{csvFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">클릭하여 파일 변경</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-lg">엑셀/CSV 파일 업로드</p>
                      <p className="text-sm text-muted-foreground mt-1">클릭하거나 파일을 드래그하세요</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="font-medium mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  파일 양식 예시
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-2 text-left">학년</th>
                        <th className="border border-border p-2 text-left">반</th>
                        <th className="border border-border p-2 text-left">번호</th>
                        <th className="border border-border p-2 text-left">이름</th>
                        <th className="border border-border p-2 text-left">문항1</th>
                        <th className="border border-border p-2 text-left">문항2</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-2">1</td>
                        <td className="border border-border p-2">1</td>
                        <td className="border border-border p-2">1</td>
                        <td className="border border-border p-2">홍길동</td>
                        <td className="border border-border p-2 text-xs">광합성은...</td>
                        <td className="border border-border p-2 text-xs">세포 호흡은...</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-2">1</td>
                        <td className="border border-border p-2">1</td>
                        <td className="border border-border p-2">2</td>
                        <td className="border border-border p-2">김철수</td>
                        <td className="border border-border p-2 text-xs">식물이...</td>
                        <td className="border border-border p-2 text-xs">미토콘드리아...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Button 
                onClick={handleFileUpload}
                disabled={!csvFile || loading}
                className="w-full h-12 text-base gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    파일 분석 중...
                  </>
                ) : (
                  <>
                    다음 단계
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'review' && parsedData) {
    const uniqueStudents = new Set(parsedData.responses.map(r => r.code));
    const numQuestions = Object.keys(parsedData.questions).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
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

          {/* Matching result alert */}
          {parsedData.matchResult && (
            <Alert className={`mb-6 ${
              parsedData.matchResult.unmatched.length > 0 
                ? 'bg-yellow-500/10 border-yellow-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              {parsedData.matchResult.unmatched.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription>
                <strong>학생 매칭 결과:</strong> {parsedData.matchResult.matched}/{parsedData.matchResult.total}명 매칭 성공
                {parsedData.matchResult.unmatched.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-yellow-600 font-medium">미매칭 학생: </span>
                    {parsedData.matchResult.unmatched.slice(0, 5).join(', ')}
                    {parsedData.matchResult.unmatched.length > 5 && ` 외 ${parsedData.matchResult.unmatched.length - 5}명`}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

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

  return null;
};
