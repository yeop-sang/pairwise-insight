import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";
import * as XLSX from 'xlsx';
import { ProjectReviewStep } from "@/components/ProjectReviewStep";

export const CreateProject = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
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

  // RFC 4180 표준 CSV 파싱 함수 - 전체 CSV 텍스트를 행으로 분리
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
          // 이스케이프된 따옴표 ("" -> ")
          currentField += '"';
          i++; // 다음 따옴표 건너뛰기
        } else {
          // 따옴표 모드 토글
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 필드 끝
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // 줄 끝 (따옴표 밖에서만)
        if (char === '\r' && nextChar === '\n') {
          i++; // \r\n 처리
        }
        // 현재 필드 추가
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          currentField = '';
        }
        // 행이 비어있지 않으면 추가
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
      } else {
        currentField += char;
      }
    }
    
    // 마지막 필드와 행 처리
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
    console.log("파일 파싱 시작:", file.name, "크기:", file.size);
    
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'csv') {
        // CSV 파싱
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("CSV 파일 읽기 완료");
          const text = e.target?.result as string;
          
          // RFC 4180 표준으로 전체 CSV 파싱 (개행 문자 포함 필드 처리)
          const rows = parseCSVToRows(text);
          console.log("CSV 총 줄 수:", rows.length);
          
          if (rows.length < 2) {
            reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
            return;
          }
          
          const headerCells = rows[0];
          const numColumns = headerCells.length;
          console.log("헤더:", headerCells);
          console.log("총 컬럼 수:", numColumns);
          
          // 문항 추출 (B1, C1, D1... -> 인덱스 1, 2, 3...)
          const questions: Record<number, string> = {};
          for (let j = 1; j < headerCells.length; j++) {
            const questionText = headerCells[j]?.trim() || `문항 ${j}`;
            questions[j] = questionText;
          }
          console.log("추출된 문항:", questions);
          
          if (numColumns < 2) {
            reject(new Error("최소 2개의 컬럼(학생번호 + 응답)이 필요합니다."));
            return;
          }
          
          const data: Array<{code: string, answer: string, questionIndex: number}> = [];
          
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i];
            const rawStudentCode = cells[0];
            
            // 숫자 학생번호 처리 강화
            const studentCode = rawStudentCode?.toString()?.trim();
            
            if (!studentCode) {
              console.log(`행 ${i + 1}: 학생번호가 비어있음`);
              continue;
            }
            
            let responseCount = 0;
            for (let j = 1; j < cells.length; j++) {
              const rawAnswer = cells[j];
              // 빈 셀도 빈 문자열로 저장
              const answer = rawAnswer?.toString()?.trim() || "";
              
              data.push({
                code: studentCode,
                answer: answer,
                questionIndex: j - 1
              });
              responseCount++;
            }
            
            console.log(`학생 ${studentCode}: ${responseCount}개 응답 파싱 (빈 응답 포함)`);
          }
          
          console.log("CSV 파싱 완료, 총 응답:", data.length);
          
          if (data.length === 0) {
            reject(new Error("유효한 학생 응답이 없습니다."));
            return;
          }
          
          resolve({ responses: data, questions });
        };
        reader.onerror = (error) => {
          console.error("CSV 파일 읽기 오류:", error);
          reject(error);
        };
        reader.readAsText(file);
        
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // 엑셀 파싱
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            console.log("엑셀 파일 읽기 완료");
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 엑셀을 JSON으로 변환 (헤더 포함)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            console.log("엑셀 원본 데이터 구조:", jsonData.slice(0, 3)); // 처음 3줄만 로깅
            console.log("엑셀 총 행 수:", jsonData.length);
            
            if (jsonData.length < 2) {
              reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
              return;
            }
            
            const headerRow = jsonData[0];
            const numColumns = headerRow.length;
            console.log("헤더:", headerRow);
            console.log("총 컬럼 수:", numColumns);
            
            if (numColumns < 2) {
              reject(new Error("최소 2개의 컬럼(학생번호 + 응답)이 필요합니다."));
              return;
            }
            
            // 문항 추출 (B1, C1, D1... -> 인덱스 1, 2, 3...)
            const questions: Record<number, string> = {};
            for (let j = 1; j < headerRow.length; j++) {
              const questionText = headerRow[j]?.toString()?.trim() || `문항 ${j}`;
              questions[j] = questionText;
            }
            console.log("추출된 문항:", questions);
            
            const data: Array<{code: string, answer: string, questionIndex: number}> = [];
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              
              if (!row || row.length === 0) {
                console.log(`행 ${i + 1}: 빈 행 건너뜀`);
                continue;
              }
              
              const rawStudentCode = row[0];
              
              // 학생번호 처리 강화 - null, undefined, 숫자 모두 처리
              let studentCode = "";
              if (rawStudentCode !== null && rawStudentCode !== undefined) {
                studentCode = rawStudentCode.toString().trim();
              }
              
              if (!studentCode) {
                console.log(`행 ${i + 1}: 학생번호가 비어있음 (원본: ${rawStudentCode})`);
                continue;
              }
              
              let responseCount = 0;
              for (let j = 1; j < row.length; j++) {
                const rawAnswer = row[j];
                
                // 빈 셀 처리 개선 - null, undefined, 빈 문자열 모두 빈 문자열로 변환
                let answer = "";
                if (rawAnswer !== null && rawAnswer !== undefined) {
                  answer = rawAnswer.toString().trim();
                }
                
                data.push({
                  code: studentCode,
                  answer: answer,
                  questionIndex: j - 1
                });
                responseCount++;
              }
              
              console.log(`학생 ${studentCode}: ${responseCount}개 응답 파싱 (빈 응답 포함)`);
            }
            
            console.log("엑셀 파싱 완료, 총 응답:", data.length);
            
            if (data.length === 0) {
              reject(new Error("유효한 학생 응답이 없습니다."));
              return;
            }
            
            resolve({ responses: data, questions });
          } catch (error) {
            console.error("엑셀 파싱 오류:", error);
            reject(new Error(`엑셀 파일 파싱에 실패했습니다: ${error}`));
          }
        };
        reader.onerror = (error) => {
          console.error("엑셀 파일 읽기 오류:", error);
          reject(error);
        };
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
      console.log("파일 파싱 시작:", csvFile.name);
      
      // Parse file (CSV or Excel)
      const { responses, questions } = await parseFile(csvFile);
      console.log("파싱된 응답 개수:", responses.length);
      console.log("파싱된 문항:", questions);
      
      if (responses.length === 0) {
        throw new Error("파일에 유효한 데이터가 없습니다.");
      }

      // Validate data structure and handle duplicates
      const validationErrors = [];
      const studentCodes = new Set();
      const responseMap = new Map<string, {code: string, answer: string, questionIndex: number, rowNumber: number}>();
      
      // 행 번호와 함께 처리하여 중복 발생 위치 추적
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // 학생번호는 반드시 있어야 하지만 응답은 빈 문자열 허용
        if (!response.code) {
          validationErrors.push(`데이터 ${i + 1}번째: 빈 학생번호가 있습니다.`);
          continue;
        }
        
        const key = `${response.code}-${response.questionIndex}`;
        
        if (responseMap.has(key)) {
          const existing = responseMap.get(key)!;
          console.log(`중복 발견: 학생 ${response.code}, 문항 ${response.questionIndex + 1} - 기존: 데이터 ${existing.rowNumber}, 새로운: 데이터 ${i + 1}`);
          
          // 첫 번째 유효한 응답 우선 선택 (빈 응답보다는 내용이 있는 응답 우선)
          if (!existing.answer && response.answer) {
            // 기존이 빈 응답이고 새로운 것이 내용이 있다면 교체
            responseMap.set(key, {...response, rowNumber: i + 1});
            console.log(`학생 ${response.code}, 문항 ${response.questionIndex + 1}: 빈 응답을 내용이 있는 응답으로 교체`);
          } else {
            // 그 외의 경우 첫 번째 응답 유지
            console.log(`학생 ${response.code}, 문항 ${response.questionIndex + 1}: 첫 번째 응답 유지`);
          }
        } else {
          responseMap.set(key, {...response, rowNumber: i + 1});
        }
        
        studentCodes.add(response.code);
      }
      
      // 중복 제거된 응답들을 배열로 변환
      const deduplicatedResponses = Array.from(responseMap.values()).map(({rowNumber, ...response}) => response);
      
      if (validationErrors.length > 0) {
        throw new Error(`데이터 검증 실패:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? '\n...' : ''}`);
      }
      
      console.log(`검증 완료: 학생 ${studentCodes.size}명, 원본 응답 ${responses.length}개, 중복 제거 후 ${deduplicatedResponses.length}개`);

      // Store parsed data and move to review step
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
      // Create project with rubrics
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: `프로젝트 ${new Date().toLocaleDateString()}`,
          description: null,
          question: JSON.stringify(parsedData.questions),
          rubric: JSON.stringify(rubrics),
          teacher_id: user.id
        })
        .select()
        .single();

      if (projectError) {
        throw new Error(`프로젝트 생성 실패: ${projectError.message}`);
      }

      // Insert student responses in batches
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

  if (step === 'review' && parsedData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <ProjectReviewStep
          questions={parsedData.questions}
          responses={parsedData.responses}
          onBack={() => setStep('upload')}
          onComplete={handleProjectComplete}
        />
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
        <h1 className="text-4xl font-bold mb-2">새 프로젝트 생성</h1>
        <p className="text-muted-foreground">
          학생 응답 파일을 업로드하세요
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              학생 응답 파일 업로드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      CSV 또는 엑셀 파일을 선택하세요
                    </p>
                    <p className="text-xs text-muted-foreground">
                      첫 번째 열: 학생번호 | 나머지 열: 각 문항 응답
                    </p>
                    {csvFile && (
                      <p className="text-sm text-primary font-medium mt-2">
                        선택된 파일: {csvFile.name}
                      </p>
                    )}
                  </div>
                </Label>
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
                    onClick={() => document.getElementById('csv-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    파일 선택
                  </Button>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">파일 형식 안내:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>첫 번째 행은 헤더 (학생번호, 문항1, 문항2, ...)</li>
                  <li>첫 번째 열에는 각 학생의 고유 번호</li>
                  <li>나머지 열에는 각 문항에 대한 학생의 응답</li>
                  <li>CSV 또는 엑셀 파일 형식 (.csv, .xlsx, .xls)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleFileUpload} 
            disabled={loading || !csvFile} 
            size="lg"
          >
            {loading ? "업로드 중..." : "다음: 루브릭 설정"}
          </Button>
        </div>
      </div>
    </div>
  );
};
