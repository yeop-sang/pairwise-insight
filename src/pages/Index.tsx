import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { BarChart3, UserCheck } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useToast } from "@/hooks/use-toast";
import ppaLogo from "@/assets/ppa-logo.png";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, signIn, signUp } = useAuth();
  const { student, login: studentLogin } = useStudentAuth();
  const { toast } = useToast();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'teacher') {
        navigate('/dashboard');
      } else if (profile.role === 'student') {
        navigate('/student-dashboard');
      }
    }
    // Also redirect if student is logged in
    if (student) {
      navigate('/student-dashboard');
    }
  }, [user, profile, student, navigate]);

  const handleLogin = async (email: string, password: string) => {
    console.log('Index handleLogin called - teacher login');
    
    try {
      const { error } = await signIn(email, password);
      
      if (!error) {
        console.log('Teacher login successful');
        // 로그인 성공 후 onAuthStateChange에서 자동으로 라우팅 처리
      } else {
        console.error('Teacher login failed:', error);
        toast({
          title: '로그인 실패',
          description: '이메일 또는 비밀번호가 올바르지 않습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: '로그인 오류',
        description: '로그인 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    console.log('Index handleSignup called - teacher signup');
    
    try {
      const { error } = await signUp(email, password, name, 'teacher');
      
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col overflow-hidden relative">
      {/* Metallic decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-metallic opacity-30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-metallic-silver/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Hero Content */}
          <div className="space-y-8 animate-slide-right">
            <div className="space-y-6">
              <h1 className="text-7xl lg:text-8xl font-bold font-display text-gradient leading-tight">
                PEER
              </h1>
              <div className="space-y-2">
                <h2 className="text-4xl lg:text-5xl font-display font-semibold text-metallic-dark">
                  Peer Assessment
                </h2>
                <p className="text-2xl text-primary font-medium">
                  AI 기반 동료평가 플랫폼
                </p>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              데이터 기반의 공정하고 객관적인 평가 시스템으로 
              학생들의 성장을 돕습니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="hover-lift text-lg h-14 px-8 font-semibold border-2 border-metallic-dark/20 hover:border-primary hover:bg-primary/5"
              >
                <Link to="/student-login">
                  <UserCheck className="mr-2 h-5 w-5" />
                  학생 로그인
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="flex items-center justify-center lg:justify-end animate-slide-up">
            <div className="w-full max-w-md">
              <div className="glass-effect rounded-2xl p-10 shadow-glow border-2 border-white/40">
                <h2 className="text-3xl font-display font-bold text-metallic-dark mb-6 text-center">
                  교사 계정으로 시작하기
                </h2>
                <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
