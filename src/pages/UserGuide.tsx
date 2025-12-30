import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Upload, UserPlus, FolderPlus, FileSpreadsheet, LogIn, BookOpen, BarChart3 } from "lucide-react";

const UserGuide = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              메인으로 돌아가기
            </Link>
          </Button>
          <h1 className="text-4xl font-bold text-gradient mb-2">PEER 사용 가이드</h1>
          <p className="text-muted-foreground">AI 기반 동료평가 플랫폼 사용 방법을 안내합니다</p>
        </div>

        <Tabs defaultValue="teacher" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="teacher" className="text-lg py-3">교사용 가이드</TabsTrigger>
            <TabsTrigger value="student" className="text-lg py-3">학생용 가이드</TabsTrigger>
          </TabsList>

          {/* 교사용 가이드 */}
          <TabsContent value="teacher" className="space-y-6">
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                교사는 이메일로 회원가입 후 학생 관리, 프로젝트 생성, 평가 관리를 할 수 있습니다.
              </AlertDescription>
            </Alert>

            {/* Step 1: 회원가입 및 로그인 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <CardTitle>회원가입 및 로그인</CardTitle>
                </div>
                <CardDescription>메인 페이지에서 교사 계정으로 시작하기</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">메인 페이지 접속</p>
                      <p className="text-sm text-muted-foreground">오른쪽 카드에서 "회원가입" 탭을 선택합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">회원가입 정보 입력</p>
                      <p className="text-sm text-muted-foreground">이름, 이메일, 비밀번호를 입력하고 "교사 회원가입" 버튼을 클릭합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">이메일 인증</p>
                      <p className="text-sm text-muted-foreground">가입한 이메일로 전송된 인증 링크를 클릭하여 이메일을 인증합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">로그인</p>
                      <p className="text-sm text-muted-foreground">이메일 인증 후 메인 페이지에서 이메일과 비밀번호로 로그인합니다</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: 학생 관리 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    학생 관리
                  </CardTitle>
                </div>
                <CardDescription>엑셀 파일로 학생 정보를 일괄 등록</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">대시보드 접속</p>
                      <p className="text-sm text-muted-foreground">로그인 후 상단 메뉴에서 "학생 관리" 버튼을 클릭합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Upload className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">엑셀 파일 업로드</p>
                      <p className="text-sm text-muted-foreground">"학생 정보 업로드" 버튼을 클릭하여 엑셀 파일을 선택합니다</p>
                    </div>
                  </div>
                  
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-background">
                    <p className="font-semibold mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      엑셀 파일 양식
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border p-2 text-left">학년</th>
                            <th className="border border-border p-2 text-left">반</th>
                            <th className="border border-border p-2 text-left">번호</th>
                            <th className="border border-border p-2 text-left">이름</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">홍길동</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">2</td>
                            <td className="border border-border p-2">김철수</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      ⚠️ 첫 번째 행은 헤더(학년, 반, 번호, 이름)여야 하며, 두 번째 행부터 학생 데이터를 입력합니다
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생 ID 및 비밀번호 자동 생성</p>
                      <p className="text-sm text-muted-foreground">
                        업로드하면 시스템이 자동으로 학생 ID와 비밀번호를 생성합니다<br/>
                        형식: 학생ID = [임의문자3자리]_[학년][반][번호] (예: ABC_1101)<br/>
                        비밀번호는 4자리 숫자로 자동 생성됩니다
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생 정보 다운로드</p>
                      <p className="text-sm text-muted-foreground">
                        "학생 정보 다운로드" 버튼을 클릭하여 생성된 학생 ID와 비밀번호를 엑셀 파일로 다운로드하여 학생들에게 배포합니다
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: 프로젝트 생성 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5" />
                    프로젝트 생성
                  </CardTitle>
                </div>
                <CardDescription>평가를 진행할 프로젝트 만들기</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">대시보드에서 "새 프로젝트 생성" 클릭</p>
                      <p className="text-sm text-muted-foreground">메인 대시보드 우측 상단의 버튼을 클릭합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">프로젝트 정보 입력</p>
                      <p className="text-sm text-muted-foreground">프로젝트 이름과 설명을 입력합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Upload className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생 답안 엑셀 파일 업로드</p>
                      <p className="text-sm text-muted-foreground">학생들의 답안이 담긴 엑셀(.xlsx) 또는 CSV 파일을 업로드합니다</p>
                    </div>
                  </div>
                  
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-background">
                    <p className="font-semibold mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      엑셀 파일 양식 (학생 답안)
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
                            <th className="border border-border p-2 text-left">...</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">홍길동</td>
                            <td className="border border-border p-2 text-xs">광합성은 빛 에너지를 이용하여...</td>
                            <td className="border border-border p-2 text-xs">세포 호흡은 산소를 소비하며...</td>
                            <td className="border border-border p-2 text-xs">...</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">2</td>
                            <td className="border border-border p-2">김철수</td>
                            <td className="border border-border p-2 text-xs">식물이 태양빛을 받아 포도당을...</td>
                            <td className="border border-border p-2 text-xs">미토콘드리아에서 ATP를 생성...</td>
                            <td className="border border-border p-2 text-xs">...</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">1</td>
                            <td className="border border-border p-2">3</td>
                            <td className="border border-border p-2">이영희</td>
                            <td className="border border-border p-2 text-xs">엽록체에서 이산화탄소와 물을...</td>
                            <td className="border border-border p-2 text-xs">포도당을 분해하여 에너지를...</td>
                            <td className="border border-border p-2 text-xs">...</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        ⚠️ <strong>첫 번째 ~ 네 번째 열:</strong> 학년, 반, 번호, 이름 (학생 관리와 동일한 형식)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ <strong>다섯 번째 열부터:</strong> 각 문항에 대한 학생의 서술형 답안
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ <strong>자동 매칭:</strong> 학생 관리에 등록된 학생과 학년/반/번호 기준으로 자동 매칭됩니다
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ <strong>매칭되지 않은 학생:</strong> 응답은 저장되지만, 해당 학생이 자기평가에서 본인 응답을 조회할 수 없습니다
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">루브릭 설정 (선택사항)</p>
                      <p className="text-sm text-muted-foreground">
                        각 문항별로 평가 기준(루브릭)을 설정할 수 있습니다. 이는 AI 피드백 생성 시 참고됩니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">프로젝트 생성 완료</p>
                      <p className="text-sm text-muted-foreground">"프로젝트 생성" 버튼을 클릭하여 완료합니다</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: 결과 확인 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    평가 결과 확인
                  </CardTitle>
                </div>
                <CardDescription>학생들의 평가 결과 및 통계 확인</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">대시보드에서 프로젝트 선택</p>
                      <p className="text-sm text-muted-foreground">생성한 프로젝트 카드를 클릭하여 상세 페이지로 이동합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생별 평가 진행 상황 확인</p>
                      <p className="text-sm text-muted-foreground">어떤 학생이 평가를 완료했는지, 누가 아직 완료하지 않았는지 확인할 수 있습니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">AI 분석 결과 보기</p>
                      <p className="text-sm text-muted-foreground">AI가 분석한 평가 결과와 통계를 확인할 수 있습니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">데이터 다운로드</p>
                      <p className="text-sm text-muted-foreground">"데이터 다운로드" 버튼을 클릭하여 평가 결과를 엑셀 파일로 다운로드할 수 있습니다</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 학생용 가이드 */}
          <TabsContent value="student" className="space-y-6">
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>중요:</strong> 학생은 회원가입을 하지 않습니다. 선생님이 지급한 학생 ID와 비밀번호로 로그인합니다.
              </AlertDescription>
            </Alert>

            {/* Step 1: 로그인 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    학생 로그인
                  </CardTitle>
                </div>
                <CardDescription>선생님이 지급한 학생 ID와 비밀번호로 로그인</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">메인 페이지에서 "학생 로그인" 버튼 클릭</p>
                      <p className="text-sm text-muted-foreground">메인 페이지 왼쪽의 "학생 로그인" 버튼을 클릭합니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생 ID와 비밀번호 입력</p>
                      <p className="text-sm text-muted-foreground">
                        선생님께 받은 학생 ID와 비밀번호를 입력합니다<br/>
                        <span className="text-xs">(예: 학생 ID = ABC_1101, 비밀번호 = 1234)</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">"로그인" 버튼 클릭</p>
                      <p className="text-sm text-muted-foreground">로그인 후 학생 대시보드로 이동합니다</p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-orange-500/30 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
                  <p className="font-semibold text-orange-700 dark:text-orange-400 mb-2">⚠️ 주의사항</p>
                  <ul className="text-sm text-orange-600 dark:text-orange-300 space-y-1">
                    <li>• 학생은 직접 회원가입을 하지 않습니다</li>
                    <li>• 반드시 선생님이 제공한 학생 ID와 비밀번호를 사용해야 합니다</li>
                    <li>• ID나 비밀번호를 분실한 경우 선생님께 문의하세요</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: 평가 프로젝트 확인 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    평가 프로젝트 확인
                  </CardTitle>
                </div>
                <CardDescription>내게 배정된 평가 프로젝트 찾기</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">학생 대시보드 확인</p>
                      <p className="text-sm text-muted-foreground">
                        로그인 후 자동으로 학생 대시보드로 이동하며, 내 학년과 반에 배정된 평가 프로젝트 목록을 볼 수 있습니다
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">프로젝트 정보 확인</p>
                      <p className="text-sm text-muted-foreground">
                        각 프로젝트 카드에서 프로젝트명, 설명, 마감일, 평가 진행률을 확인할 수 있습니다
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">평가할 프로젝트 선택</p>
                      <p className="text-sm text-muted-foreground">"평가 시작하기" 버튼을 클릭하여 동료 평가를 시작합니다</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: 동료 평가 진행 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <CardTitle>동료 평가 진행</CardTitle>
                </div>
                <CardDescription>같은 반 학생들을 평가하기</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">평가 대상 학생 선택</p>
                      <p className="text-sm text-muted-foreground">
                        같은 반 학생 목록이 표시되며, 평가할 학생을 순서대로 선택합니다 (자기 자신은 제외됩니다)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">평가 질문에 응답</p>
                      <p className="text-sm text-muted-foreground">
                        선생님이 만든 평가 질문들을 읽고, 각 질문에 대해 1~5점으로 점수를 매깁니다<br/>
                        <span className="text-xs">(1점 = 매우 낮음, 5점 = 매우 높음)</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">다음 학생 평가</p>
                      <p className="text-sm text-muted-foreground">
                        한 학생의 평가를 완료하면 "다음" 버튼을 클릭하여 다음 학생을 평가합니다
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">평가 완료</p>
                      <p className="text-sm text-muted-foreground">
                        모든 학생에 대한 평가를 완료하면 "제출하기" 버튼을 클릭하여 평가를 제출합니다
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                  <p className="font-semibold text-blue-700 dark:text-blue-400 mb-2">💡 평가 팁</p>
                  <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                    <li>• 공정하고 객관적으로 평가해주세요</li>
                    <li>• 친분이 아닌 실제 프로젝트 기여도를 기준으로 평가하세요</li>
                    <li>• 평가는 익명으로 진행되며, 다른 학생들은 누가 평가했는지 알 수 없습니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: 결과 확인 */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    나의 평가 결과 확인
                  </CardTitle>
                </div>
                <CardDescription>내가 받은 동료 평가 결과 보기</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">결과 페이지 이동</p>
                      <p className="text-sm text-muted-foreground">
                        선생님이 평가를 마감하면 학생 대시보드에서 "결과 보기" 버튼이 활성화됩니다
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">평가 점수 확인</p>
                      <p className="text-sm text-muted-foreground">
                        각 질문에 대해 반 친구들이 나에게 준 평균 점수를 확인할 수 있습니다
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">반 평균과 비교</p>
                      <p className="text-sm text-muted-foreground">
                        내 점수가 반 평균보다 높은지 낮은지 그래프로 확인할 수 있습니다
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <Button asChild size="lg">
            <Link to="/">시작하기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
