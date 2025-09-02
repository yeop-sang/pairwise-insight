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

  const handleLogin = async (email: string, password: string, role?: 'teacher' | 'student') => {
    console.log('Index handleLogin called with role:', role);
    
    try {
      if (role === 'student') {
        // 학생 로그인: students 테이블 사용
        const { error } = await studentLogin(email, password);
        
        if (!error) {
          console.log('Student login successful');
          navigate('/student-dashboard');
        } else {
          console.error('Student login failed:', error);
          toast({
            title: '로그인 실패',
            description: error,
            variant: 'destructive',
          });
        }
      } else {
        // 교사 로그인: Supabase Auth 사용
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
          
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            비교 평가를 통해 학생 평가를 혁신하세요. 
            Bradley-Terry 모델링을 사용하여 간단한 쌍대비교에서 신뢰할 수 있는 순위를 생성합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/dashboard">
                <BarChart3 className="mr-2 h-4 w-4" />
                교사용 대시보드
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/student-login">
                <UserCheck className="mr-2 h-4 w-4" />
                학생 로그인
              </Link>
            </Button>
          </div>
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
