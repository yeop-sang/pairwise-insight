import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { ArrowLeft, GraduationCap, ArrowRight } from 'lucide-react';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useStudentAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId || !password) {
      toast({
        title: '오류',
        description: '학생 ID와 비밀번호를 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    const { error } = await login(studentId, password);
    
    if (error) {
      toast({
        title: '로그인 실패',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '로그인 성공',
        description: '환영합니다!',
      });
      navigate('/student-dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 animate-slide-up">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            메인으로 돌아가기
          </Link>
          
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            학생 로그인
          </h1>
          <p className="text-muted-foreground">
            학생 ID와 비밀번호로 로그인하세요
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">로그인</CardTitle>
            <CardDescription>
              선생님이 제공한 학생 ID와 비밀번호를 입력하세요
              <span className="text-xs text-muted-foreground mt-1 block">
                예: ABC10101 (1학년 1반 1번)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="studentId">학생 ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="예: ABC10101"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  maxLength={8}
                  required
                  className="h-12 bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  알파벳 3글자 + 학년(1자리) + 반(2자리) + 번호(2자리)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-background/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 group"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                    로그인 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    로그인
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
