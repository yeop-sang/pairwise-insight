import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Upload, Trash2, Search, ArrowLeft, UserX, GraduationCap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  student_id: string;
  grade: number;
  class_number: number;
  student_number: number;
  name: string;
  created_at: string;
}

interface ClassStats {
  grade: number;
  class_number: number;
  count: number;
}

export const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'grade' | 'class', grade: number, class?: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStudents();
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, selectedGrade, selectedClass]);

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', user.id)
        .order('grade', { ascending: true })
        .order('class_number', { ascending: true })
        .order('student_number', { ascending: true });

      if (error) throw error;
      
      setStudents(data || []);
      calculateClassStats(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: '오류',
        description: '학생 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateClassStats = (studentsData: Student[]) => {
    const stats = studentsData.reduce((acc, student) => {
      const key = `${student.grade}-${student.class_number}`;
      if (!acc[key]) {
        acc[key] = {
          grade: student.grade,
          class_number: student.class_number,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, ClassStats>);

    setClassStats(Object.values(stats).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.class_number - b.class_number;
    }));
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGrade !== null) {
      filtered = filtered.filter(student => student.grade === selectedGrade);
    }

    if (selectedClass !== null) {
      filtered = filtered.filter(student => student.class_number === selectedClass);
    }

    setFilteredStudents(filtered);
  };

  const generateRandomPrefix = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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

        const studentId = `${prefix}${grade}${classNumber.toString().padStart(2, '0')}${studentNumber.toString().padStart(2, '0')}`;
        const password = `${grade}${classNumber.toString().padStart(2, '0')}${studentNumber.toString().padStart(2, '0')}`;

        studentsData.push({
          teacher_id: user.id,
          student_id: studentId,
          password: password,
          grade: grade,
          class_number: classNumber,
          student_number: studentNumber,
          name: name,
        });
      }

      // students 테이블에 학생 정보 추가
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('teacher_id', user.id);

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

  const deleteByGrade = async (grade: number) => {
    if (!user) return;
    
    try {
      const { data: studentsToDelete, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('grade', grade);

      if (fetchError) throw fetchError;

      if (!studentsToDelete || studentsToDelete.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년에 삭제할 학생이 없습니다.`,
        });
        return;
      }

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('teacher_id', user.id)
        .eq('grade', grade);

      if (error) throw error;

      toast({
        title: '성공',
        description: `${grade}학년 학생 ${studentsToDelete.length}명이 삭제되었습니다.`,
      });

      fetchStudents();
    } catch (error) {
      console.error('Error deleting students by grade:', error);
      toast({
        title: '오류',
        description: '학년별 학생 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const deleteByClass = async (grade: number, classNumber: number) => {
    if (!user) return;
    
    try {
      const { data: studentsToDelete, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (fetchError) throw fetchError;

      if (!studentsToDelete || studentsToDelete.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반에 삭제할 학생이 없습니다.`,
        });
        return;
      }

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('teacher_id', user.id)
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (error) throw error;

      toast({
        title: '성공',
        description: `${grade}학년 ${classNumber}반 학생 ${studentsToDelete.length}명이 삭제되었습니다.`,
      });

      fetchStudents();
    } catch (error) {
      console.error('Error deleting students by class:', error);
      toast({
        title: '오류',
        description: '반별 학생 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'grade') {
      deleteByGrade(deleteTarget.grade);
    } else {
      deleteByClass(deleteTarget.grade, deleteTarget.class!);
    }
    
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGrade(null);
    setSelectedClass(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  const totalStudents = students.length;
  const uniqueGrades = [...new Set(students.map(s => s.grade))].sort();
  const uniqueClasses = selectedGrade 
    ? [...new Set(students.filter(s => s.grade === selectedGrade).map(s => s.class_number))].sort()
    : [];

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
        <h1 className="text-3xl font-bold mb-2">학생 관리</h1>
        <p className="text-muted-foreground">전체 학생을 관리하고 프로젝트에 할당할 수 있습니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 학생 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학년 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueGrades.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">반 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">필터된 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStudents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* 반별 통계 */}
      {classStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>반별 학생 현황</CardTitle>
              <div className="flex gap-2">
                {uniqueGrades.map((grade) => (
                  <Button
                    key={grade}
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteTarget({ type: 'grade', grade });
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    {grade}학년 삭제
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {classStats.map((stat) => (
                <div key={`${stat.grade}-${stat.class_number}`} className="flex items-center gap-1">
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setSelectedGrade(stat.grade);
                      setSelectedClass(stat.class_number);
                    }}
                  >
                    {stat.grade}학년 {stat.class_number}반 ({stat.count}명)
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setDeleteTarget({ type: 'class', grade: stat.grade, class: stat.class_number });
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <UserX className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>필터 및 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium mb-2 block">검색</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 학생 ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">학년</label>
              <select
                value={selectedGrade || ''}
                onChange={(e) => {
                  const grade = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedGrade(grade);
                  setSelectedClass(null);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">전체</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}학년</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">반</label>
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedGrade}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">전체</option>
                {uniqueClasses.map(classNum => (
                  <option key={classNum} value={classNum}>{classNum}반</option>
                ))}
              </select>
            </div>

            <Button variant="outline" onClick={resetFilters}>
              필터 초기화
            </Button>

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
        </CardContent>
      </Card>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학생 일괄 삭제</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'grade' 
                ? `${deleteTarget.grade}학년 모든 학생을 삭제하시겠습니까?`
                : `${deleteTarget?.grade}학년 ${deleteTarget?.class}반 모든 학생을 삭제하시겠습니까?`
              }
              <br />
              <span className="text-destructive font-medium">이 작업은 되돌릴 수 없습니다.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 학생 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
          <CardDescription>
            {filteredStudents.length > 0 
              ? `총 ${filteredStudents.length}명의 학생이 있습니다.`
              : '조건에 맞는 학생이 없습니다.'
            }
          </CardDescription>
        </CardHeader>
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
                <TableHead>등록일</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm || selectedGrade || selectedClass 
                      ? '조건에 맞는 학생이 없습니다.'
                      : '등록된 학생이 없습니다. 학생을 추가해주세요.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-sm">
                      {student.student_id}
                    </TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.grade}학년</TableCell>
                    <TableCell>{student.class_number}반</TableCell>
                    <TableCell>{student.student_number}번</TableCell>
                    <TableCell className="font-mono text-sm">
                      {student.grade}{student.class_number.toString().padStart(2, '0')}{student.student_number.toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
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
    </div>
  );
};