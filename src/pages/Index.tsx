import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ppaLogo from "@/assets/ppa-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleLogin = async (email: string, password: string, role?: 'teacher' | 'student') => {
    console.log('Index handleLogin called with role:', role);
    
    try {
      const { error } = await signIn(email, password);
      
      if (!error) {
        console.log('Login successful, forcing page refresh');
        // 강제로 페이지 새로고침하여 인증 상태 반영
        if (role === 'teacher') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/student-dashboard';
        }
      } else {
        console.error('Login failed:', error);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleSignup = async (email: string, password: string, name: string, role: 'teacher' | 'student') => {
    console.log('Index handleSignup called with role:', role);
    
    try {
      const { error } = await signUp(email, password, name, role);
      
      if (!error) {
        console.log('Signup successful');
        // 회원가입 후 이메일 확인 안내 (toast는 useAuth에서 처리)
      } else {
        console.error('Signup failed:', error);
      }
    } catch (error) {
      console.error('Signup error:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Left Side - Logo and Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-2xl">
          <div className="flex flex-col items-center mb-8">
            <img src={ppaLogo} alt="PPA Logo" className="h-24 w-24 mb-6" />
            <h1 className="text-6xl font-bold text-foreground mb-4">
              Pairwise
            </h1>
            <h2 className="text-3xl font-medium text-primary">
              동료평가
            </h2>
          </div>
          
          <p className="text-xl text-muted-foreground leading-relaxed">
            비교 평가를 통해 학생 평가를 혁신하세요. 
            Bradley-Terry 모델링을 사용하여 간단한 쌍대비교에서 신뢰할 수 있는 순위를 생성합니다.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-96 flex items-center justify-center p-8 bg-card/50 backdrop-blur-sm">
        <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
      </div>
    </div>
  );
};

export default Index;
