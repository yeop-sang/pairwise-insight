import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, GraduationCap, BookOpen } from "lucide-react";

interface AuthFormProps {
  onLogin: (email: string, password: string, role?: 'teacher' | 'student') => void;
  onSignup: (email: string, password: string, name: string, role: 'teacher' | 'student') => void;
}

export const AuthForm = ({ onLogin, onSignup }: AuthFormProps) => {
  const [studentLoginData, setStudentLoginData] = useState({ email: "", password: "" });
  const [teacherLoginData, setTeacherLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", name: "" });

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Student login:', studentLoginData);
    onLogin(studentLoginData.email, studentLoginData.password, 'student');
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Teacher login:', teacherLoginData);
    console.log('Calling onLogin with teacher role');
    onLogin(teacherLoginData.email, teacherLoginData.password, 'teacher');
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup(signupData.email, signupData.password, signupData.name, 'teacher'); // 교사 회원가입만 가능
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Student Login */}
      <Card className="shadow-medium">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            학생 로그인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-email"
                  type="email"
                  placeholder="학생 이메일을 입력하세요"
                  className="pl-10"
                  value={studentLoginData.email}
                  onChange={(e) => setStudentLoginData({...studentLoginData, email: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="student-password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  className="pl-10"
                  value={studentLoginData.password}
                  onChange={(e) => setStudentLoginData({...studentLoginData, password: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" variant="default">
              학생으로 로그인
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Teacher Login */}
      <Card className="shadow-medium">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5 text-success" />
            교사 로그인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-login-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="teacher-login-email"
                      type="email"
                      placeholder="교사 이메일을 입력하세요"
                      className="pl-10"
                      value={teacherLoginData.email}
                      onChange={(e) => setTeacherLoginData({...teacherLoginData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-login-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="teacher-login-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      className="pl-10"
                      value={teacherLoginData.password}
                      onChange={(e) => setTeacherLoginData({...teacherLoginData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" variant="default">
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
                    <Input
                      id="teacher-signup-name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      className="pl-10"
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-signup-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="teacher-signup-email"
                      type="email"
                      placeholder="교사 이메일을 입력하세요"
                      className="pl-10"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teacher-signup-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="teacher-signup-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      className="pl-10"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" variant="default">
                  교사로 회원가입
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};