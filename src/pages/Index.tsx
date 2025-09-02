import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ppaLogo from "@/assets/ppa-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, profile, loading } = useAuth();

  useEffect(() => {
    if (user && profile) {
      // Redirect based on role
      if (profile.role === 'teacher') {
        navigate("/dashboard");
      } else {
        navigate("/student-dashboard");
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (!error) {
      // Navigation will be handled by useEffect
    }
  };

  const handleSignup = async (email: string, password: string, name: string, role: 'teacher' | 'student') => {
    const { error } = await signUp(email, password, name, role);
    if (!error) {
      // Navigation will be handled by useEffect after email confirmation
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

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

          {/* Simple catchphrase */}
          <div className="mt-16 text-center">
            <p className="text-2xl font-medium text-primary italic">
              "간단한 비교, 명확한 순위"
            </p>
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
