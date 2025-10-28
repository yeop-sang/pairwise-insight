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
    <div className="min-h-screen bg-gradient-subtle flex overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Left Side - Logo and Content */}
      <div className="flex-1 flex items-center justify-center px-8 relative z-10">
        <div className="text-center max-w-2xl animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <img src={ppaLogo} alt="PPA Logo" className="h-24 w-24 relative" />
            </div>
            <h1 className="text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
              PEER
            </h1>
            <h2 className="text-4xl font-medium text-primary">
              동료평가
            </h2>
          </div>
          
          <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto">
            비교 평가를 통해 학생 평가를 혁신하세요. 
            <span className="text-foreground font-semibold"> Bradley-Terry 모델링</span>을 사용하여 간단한 쌍대비교에서 신뢰할 수 있는 순위를 생성합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="hover-lift shadow-medium">
              <Link to="/dashboard">
                <BarChart3 className="mr-2 h-5 w-5" />
                교사용 대시보드
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="hover-lift">
              <Link to="/student-login">
                <UserCheck className="mr-2 h-5 w-5" />
                학생 로그인
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-96 flex items-center justify-center p-8 glass-effect relative z-10 animate-slide-up">
        <AuthForm onLogin={handleLogin} onSignup={handleSignup} />
      </div>
    </div>
  );
};

export default Index;
