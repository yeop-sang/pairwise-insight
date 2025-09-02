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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            메인으로 돌아가기
          </Link>
          
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">학생 로그인</h1>
          <p className="text-muted-foreground">
            학생 ID와 비밀번호로 로그인하세요
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">로그인</CardTitle>
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
                className="w-full"
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