import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { ArrowLeft, GraduationCap } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            메인으로 돌아가기
          </Link>
          
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow relative">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">학생 로그인</h1>
          <p className="text-muted-foreground">
            학생 ID와 비밀번호로 로그인하세요
          </p>
        </div>

        <Card className="shadow-strong border-0 bg-gradient-card hover-lift">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              선생님이 제공한 학생 ID와 비밀번호를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">학생 ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="학생 ID를 입력하세요"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
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
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-medium hover:shadow-strong transition-all"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};