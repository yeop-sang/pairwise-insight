import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { BarChart3, UserCheck, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    signIn,
    signUp,
    resetPassword
  } = useAuth();
  const {
    student
  } = useStudentAuth();
  const {
    isAdmin,
    isTeacher,
    isLoading
  } = useUserRole();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (isLoading) return;
    if (user && profile) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isTeacher) {
        navigate('/dashboard');
      }
    }
    if (student) {
      navigate('/student-dashboard');
    }
  }, [user, profile, student, isAdmin, isTeacher, isLoading, navigate]);
  const handleLogin = async (email: string, password: string) => {
    try {
      const {
        error
      } = await signIn(email, password);
      if (error) {
        toast({
          title: '로그인 실패',
          description: '이메일 또는 비밀번호가 올바르지 않습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '로그인 오류',
        description: '로그인 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };
  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      await signUp(email, password, name, 'teacher');
    } catch (error) {
      console.error('Signup error:', error);
    }
  };
  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-12">
        <div className="w-full max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Hero Content */}
          <div className="space-y-8 animate-slide-right">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg shadow-primary/25">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-tight tracking-tight">
                PEER
              </h1>
              <div className="space-y-3">
                <h2 className="text-3xl lg:text-4xl font-semibold text-foreground/90">
                  Peer Evaluation Encouraging Reflection
                </h2>
                <p className="text-xl text-primary font-medium">동료평가 시스템</p>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              ​생각을 나누고 함께 성장하는 동료평가    
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" size="lg" asChild className="text-lg h-14 px-8 font-semibold border-2 border-border hover:border-primary hover:bg-primary/5 backdrop-blur-sm bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg">
                <Link to="/student-login">
                  <UserCheck className="mr-2 h-5 w-5" />
                  학생 로그인
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-lg h-14 px-8 font-semibold border-2 border-border hover:border-primary hover:bg-primary/5 backdrop-blur-sm bg-card/50 transition-all hover:-translate-y-1 hover:shadow-lg">
                <Link to="/user-guide">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  사용방법
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="flex items-center justify-center lg:justify-end animate-slide-up">
            <div className="w-full max-w-md">
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl"></div>
                
                <div className="relative backdrop-blur-xl bg-card/80 border border-border/50 rounded-2xl p-10 shadow-2xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      교사 계정으로 시작하기
                    </h2>
                  </div>
                  <AuthForm onLogin={handleLogin} onSignup={handleSignup} onResetPassword={handleResetPassword} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;