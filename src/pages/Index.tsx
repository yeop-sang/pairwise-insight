import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "@/components/AuthForm";
import { BarChart3, Users, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ppaLogo from "@/assets/ppa-logo.png";

const Index = () => {
  const navigate = useNavigate();

  const handleLogin = (email: string, password: string) => {
    // 로그인 로직 - 수파베이스 연결 후 구현
    console.log("로그인 시도:", { email, password });
    // 임시로 대시보드로 이동
    navigate("/dashboard");
  };

  const handleSignup = (email: string, password: string, name: string) => {
    // 회원가입 로직 - 수파베이스 연결 후 구현
    console.log("회원가입 시도:", { email, password, name });
    // 임시로 대시보드로 이동
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle relative">
      {/* Main Content - Left 3/4 */}
      <div className="container mx-auto px-4 py-16 pr-96">
        {/* Logo and Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <img src={ppaLogo} alt="PPA Logo" className="h-20 w-20 mr-4" />
            <h1 className="text-5xl font-bold text-foreground leading-tight">
              쌍대비교 동료평가
            </h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            비교 평가를 통해 학생 평가를 혁신하세요. 
            Bradley-Terry 모델링을 사용하여 간단한 쌍대비교에서 신뢰할 수 있는 순위를 생성합니다.
          </p>
          
          <div className="flex justify-center mb-16">
            <Button
              variant="academic"
              size="xl"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              대시보드 보기
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">쉬운 비교</h3>
                <p className="text-muted-foreground text-sm">
                  키보드 단축키가 있는 간단한 나란히 인터페이스. 
                  학생들이 빠르고 효율적으로 쌍을 비교할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mb-4">
                  <BarChart3 className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">신뢰할 수 있는 순위</h3>
                <p className="text-muted-foreground text-sm">
                  Bradley-Terry 통계 모델링은 신뢰 구간과 
                  신뢰성 지표를 포함한 강력한 순위를 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg mb-4">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">교사 제어</h3>
                <p className="text-muted-foreground text-sm">
                  질문, 과제, 설정에 대한 완전한 교사 제어. 
                  추가 분석을 위한 데이터 내보내기 가능.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Auth Form - Right 1/4 Fixed Position */}
      <div className="fixed top-1/2 right-8 transform -translate-y-1/2 w-80">
        <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
      </div>
    </div>
  );
};

export default Index;
