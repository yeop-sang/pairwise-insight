import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Plus, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Project {
  id: string;
  title: string;
  description: string;
  question: string;
  is_active: boolean;
  created_at: string;
}

interface Student {
  id: string;
  student_id: string;
  grade: number;
  class_number: number;
  student_number: number;
  name: string;
  has_completed: boolean;
  created_at: string;
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) {
      navigate('/');
      return;
    }
    fetchProject();
    fetchStudents();
  }, [user, id]);

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: '오류',
        description: '프로젝트를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  };

  const fetchStudents = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('project_id', id)
        .order('grade', { ascending: true })
        .order('class_number', { ascending: true })
        .order('student_number', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPrefix = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('Excel 파일에 데이터가 부족합니다.');
      }

      const headers = jsonData[0];
      const expectedHeaders = ['학년', '반', '번호', '이름'];
      
      if (!expectedHeaders.every((header, index) => headers[index] === header)) {
        throw new Error('Excel 파일의 첫 번째 행은 "학년", "반", "번호", "이름" 순서여야 합니다.');
      }

      const studentsData = [];
      const prefix = generateRandomPrefix();

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0] || !row[1] || !row[2] || !row[3]) continue;

        const grade = parseInt(row[0]);
        const classNumber = parseInt(row[1]);
        const studentNumber = parseInt(row[2]);
        const name = row[3];

        const studentId = `${prefix}_${grade}${classNumber}${studentNumber.toString().padStart(2, '0')}`;
        const password = `${grade}${classNumber}${studentNumber.toString().padStart(2, '0')}`;

        studentsData.push({
          project_id: project.id,
          student_id: studentId,
          password: password,
          grade: grade,
          class_number: classNumber,
          student_number: studentNumber,
          name: name,
        });
      }

      const { error } = await supabase
        .from('students')
        .insert(studentsData);

      if (error) throw error;

      toast({
        title: '성공',
        description: `${studentsData.length}명의 학생이 추가되었습니다.`,
      });

      setIsDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      console.error('Error uploading students:', error);
      toast({
        title: '오류',
        description: error.message || '학생 목록을 업로드하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm('이 학생을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: '성공',
        description: '학생이 삭제되었습니다.',
      });

      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: '오류',
        description: '학생을 삭제하는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">프로젝트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const completedCount = students.filter(s => s.has_completed).length;
  const totalCount = students.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          대시보드로 돌아가기
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground mt-2">{project.description}</p>
          </div>
          <Badge variant={project.is_active ? "default" : "secondary"}>
            {project.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 학생 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료한 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">학생 관리</TabsTrigger>
          <TabsTrigger value="responses">응답 현황</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">학생 목록</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  학생 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>학생 목록 업로드</DialogTitle>
                  <DialogDescription>
                    Excel 파일로 학생 목록을 일괄 업로드할 수 있습니다.
                    <br />
                    파일 형식: 1행에 "학년", "반", "번호", "이름" 순서로 입력
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {uploading && (
                    <p className="text-sm text-muted-foreground">업로드 중...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>학생 ID</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>학년</TableHead>
                    <TableHead>반</TableHead>
                    <TableHead>번호</TableHead>
                    <TableHead>비밀번호</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        등록된 학생이 없습니다. 학생을 추가해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono text-sm">
                          {student.student_id}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.grade}학년</TableCell>
                        <TableCell>{student.class_number}반</TableCell>
                        <TableCell>{student.student_number}번</TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.grade}{student.class_number}{student.student_number.toString().padStart(2, '0')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.has_completed ? "default" : "secondary"}>
                            {student.has_completed ? '완료' : '미완료'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStudent(student.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>응답 현황</CardTitle>
              <CardDescription>
                학생들의 응답 현황을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">응답 현황 기능은 개발 중입니다.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 설정</CardTitle>
              <CardDescription>
                프로젝트의 활성화 상태 및 기타 설정을 변경할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">설정 기능은 개발 중입니다.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};