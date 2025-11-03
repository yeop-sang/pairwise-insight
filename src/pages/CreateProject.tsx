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
    console.log("파일 파싱 시작:", file.name, "크기:", file.size);
    
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (fileExtension === 'csv') {
        // CSV 파싱
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("CSV 파일 읽기 완료");
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          console.log("CSV 총 줄 수:", lines.length);
          
          if (lines.length < 2) {
            reject(new Error("파일에는 최소 2줄(헤더 + 데이터)이 필요합니다."));
            return;
          }
          
      const headerCells = lines[0].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const numColumns = headerCells.length;
      console.log("헤더:", headerCells);
      console.log("총 컬럼 수:", numColumns);
          
          if (numColumns < 2) {
            reject(new Error("최소 2개의 컬럼(학생번호 + 응답)이 필요합니다."));
            return;
          }
          
          const data: Array<{code: string, answer: string, questionIndex: number}> = [];
          
          for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
            const rawStudentCode = cells[0];
            
            // 숫자 학생번호 처리 강화
            const studentCode = rawStudentCode?.toString()?.trim();
            
            if (!studentCode) {
              console.log(`줄 ${i + 1}: 학생번호가 비어있음`);
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
          
          resolve(data);
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
            
            resolve(data);
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
      console.log("파일 파싱 시작:", csvFile.name);
      
      // Parse file (CSV or Excel)
      const responses = await parseFile(csvFile);
      console.log("파싱된 응답 개수:", responses.length);
      
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

      // Create project
      console.log("프로젝트 생성 중...");
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          question: projectData.question || null,
          rubric: projectData.rubric || null,
          teacher_id: user.id
        })
        .select()
        .single();

      if (projectError) {
        console.error("프로젝트 생성 오류:", projectError);
        throw new Error(`프로젝트 생성 실패: ${projectError.message}`);
      }
      
      console.log("프로젝트 생성 완료:", project.id);

      // Create or find students based on student codes
      console.log("학생 정보 처리 중...");
      const uniqueStudentCodes = Array.from(new Set(deduplicatedResponses.map(r => r.code)));
      const studentCodeToIdMap = new Map<string, string>();
      
      for (const code of uniqueStudentCodes) {
        // Check if student exists
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', code)
          .eq('teacher_id', user.id)
          .single();
        
        if (existingStudent) {
          studentCodeToIdMap.set(code, existingStudent.id);
          console.log(`학생 ${code}: 기존 학생 사용`);
        } else {
          // Parse student code to extract grade, class, student number
          // Assuming code format: ABC10101 (3 letters + 5 digits)
          const codeDigits = code.slice(-5); // Get last 5 digits
          const grade = parseInt(codeDigits[0]) || 1;
          const classNumber = parseInt(codeDigits.slice(1, 3)) || 1;
          const studentNumber = parseInt(codeDigits.slice(3, 5)) || 1;
          
          // Password is the 5-digit number part
          const password = codeDigits;
          
          // Create new student with minimal data
          const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({
              student_id: code,
              name: `학생 ${code}`,
              password: password,
              teacher_id: user.id,
              grade: grade,
              class_number: classNumber,
              student_number: studentNumber
            })
            .select('id')
            .single();
          
          if (studentError) {
            console.error(`학생 생성 오류 (${code}):`, studentError);
            throw new Error(`학생 생성 실패 (${code}): ${studentError.message}`);
          }
          
          studentCodeToIdMap.set(code, newStudent.id);
          console.log(`학생 ${code}: 새로 생성됨`);
        }
      }

      // Insert student responses in batches
      console.log("학생 응답 삽입 중...");
      const batchSize = 100;
      const responseBatches = [];
      
      for (let i = 0; i < deduplicatedResponses.length; i += batchSize) {
        responseBatches.push(deduplicatedResponses.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < responseBatches.length; i++) {
        const batch = responseBatches[i];
        const { error: responsesError } = await supabase
          .from('student_responses')
          .insert(
            batch.map(response => ({
              project_id: project.id,
              student_id: studentCodeToIdMap.get(response.code)!,
              student_code: response.code,
              response_text: response.answer,
              question_number: response.questionIndex + 1 // 1-based indexing
            }))
          );

        if (responsesError) {
          console.error(`응답 삽입 오류 (배치 ${i + 1}/${responseBatches.length}):`, responsesError);
          throw new Error(`학생 응답 삽입 실패 (배치 ${i + 1}): ${responsesError.message}`);
        }
        
        console.log(`응답 배치 ${i + 1}/${responseBatches.length} 삽입 완료`);
      }

      // Assign students from CSV file to this project
      const studentIdsToAssign = Array.from(studentCodeToIdMap.values());
      console.log(`프로젝트에 ${studentIdsToAssign.length}명의 학생 할당 중...`);

      if (studentIdsToAssign.length > 0) {
        const { error: assignmentError } = await supabase
          .from('project_assignments')
          .insert(
            studentIdsToAssign.map(studentId => ({
              project_id: project.id,
              student_id: studentId
            }))
          );

        if (assignmentError) {
          console.error("프로젝트 할당 오류:", assignmentError);
          throw new Error(`학생 할당 실패: ${assignmentError.message}`);
        }
        
        console.log(`${studentIdsToAssign.length}명의 학생이 프로젝트에 할당되었습니다.`);
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
              <Label htmlFor="question">평가 질문 (선택사항)</Label>
              <Textarea
                id="question"
                value={projectData.question}
                onChange={(e) => setProjectData({...projectData, question: e.target.value})}
                placeholder="학생들이 비교할 때 참고할 질문을 입력하세요"
                rows={3}
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
                  지원 형식: .csv, .xlsx, .xls | 형식: A열(학생번호), B열부터(학생 응답)
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
                  <p className="text-sm font-medium mb-1">CSV 또는 엑셀 형식:</p>
                  <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                    <div className="grid grid-cols-4 gap-1 font-mono">
                      <div className="font-bold">A1: 학생번호</div>
                      <div className="font-bold">B1~: (문항 또는 빈칸)</div>
                      <div></div>
                      <div></div>
                      <div>A2: 1</div>
                      <div>B2: 응답1</div>
                      <div>C2: 응답2</div>
                      <div>D2: 응답3</div>
                      <div>A3: 2</div>
                      <div>B3: 응답1</div>
                      <div>C3: 응답2</div>
                      <div>D3: 응답3</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * A열: 학생 식별번호 (필수)<br/>
                * B열부터: 각 문항에 대한 학생 응답 (첫 번째 행은 문항명이거나 비워둘 수 있음)
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