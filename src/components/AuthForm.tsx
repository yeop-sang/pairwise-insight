import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, GraduationCap, BookOpen } from "lucide-react";
interface AuthFormProps {
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string, name: string) => void;
}
export const AuthForm = ({
  onLogin,
  onSignup
}: AuthFormProps) => {
  const [teacherLoginData, setTeacherLoginData] = useState({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    name: ""
  });
  const normalizeEmail = (email: string): string => {
    // @가 없으면 기본 도메인 추가
    if (email && !email.includes('@')) {
      return `${email}@example.com`;
    }
    return email;
  };
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Teacher login:', teacherLoginData);
    const normalizedEmail = normalizeEmail(teacherLoginData.email);
    onLogin(normalizedEmail, teacherLoginData.password);
  };
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(signupData.email);
    onSignup(normalizedEmail, signupData.password, signupData.name);
  };
  return <div className="w-full max-w-md space-y-6">
      {/* Teacher Login */}
      <Card className="shadow-strong border-0 bg-gradient-card hover-lift">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
          </CardTitle>
          
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-soft">로그인</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-soft">회원가입</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-login-email">이메일 또는 ID</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="teacher-login-email" type="text" placeholder="이메일 또는 ID를 입력하세요" className="pl-10" value={teacherLoginData.email} onChange={e => setTeacherLoginData({
                    ...teacherLoginData,
                    email: e.target.value
                  })} required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-login-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="teacher-login-password" type="password" placeholder="비밀번호를 입력하세요" className="pl-10" value={teacherLoginData.password} onChange={e => setTeacherLoginData({
                    ...teacherLoginData,
                    password: e.target.value
                  })} required />
                  </div>
                </div>
                
                <Button type="submit" className="w-full shadow-medium hover:shadow-strong transition-all" variant="default">
                  교사로 로그인
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-signup-name">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="teacher-signup-name" type="text" placeholder="이름을 입력하세요" className="pl-10" value={signupData.name} onChange={e => setSignupData({
                    ...signupData,
                    name: e.target.value
                  })} required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-signup-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="teacher-signup-email" type="text" placeholder="이메일을 입력하세요" className="pl-10" value={signupData.email} onChange={e => setSignupData({
                    ...signupData,
                    email: e.target.value
                  })} required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-signup-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="teacher-signup-password" type="password" placeholder="비밀번호를 입력하세요" className="pl-10" value={signupData.password} onChange={e => setSignupData({
                    ...signupData,
                    password: e.target.value
                  })} required />
                  </div>
                </div>
                
                <Button type="submit" className="w-full shadow-medium hover:shadow-strong transition-all" variant="default">
                  교사로 회원가입
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};