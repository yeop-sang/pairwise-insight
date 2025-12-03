import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Upload, Trash2, Search, ArrowLeft, UserX, GraduationCap, Sparkles, FileSpreadsheet } from 'lucide-react';
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
        acc[key] = { grade: student.grade, class_number: student.class_number, count: 0 };
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

      const { error } = await supabase.from('students').insert(studentsData);

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
      if (event.target) event.target.value = '';
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm('이 학생을 삭제하시겠습니까?')) return;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('teacher_id', user.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: '오류',
          description: '해당 학생을 찾을 수 없거나 삭제 권한이 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: '성공', description: '학생이 삭제되었습니다.' });
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
      const { data: studentsToDelete } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('grade', grade);

      if (!studentsToDelete || studentsToDelete.length === 0) {
        toast({ title: '알림', description: `${grade}학년에 삭제할 학생이 없습니다.` });
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
      const { data: studentsToDelete } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (!studentsToDelete || studentsToDelete.length === 0) {
        toast({ title: '알림', description: `${grade}학년 ${classNumber}반에 삭제할 학생이 없습니다.` });
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  const totalStudents = students.length;
  const uniqueGrades = [...new Set(students.map(s => s.grade))].sort();
  const uniqueClasses = selectedGrade 
    ? [...new Set(students.filter(s => s.grade === selectedGrade).map(s => s.class_number))].sort()
    : [];

  const statCards = [
    { label: '총 학생 수', value: totalStudents, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-500' },
    { label: '학년 수', value: uniqueGrades.length, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-500' },
    { label: '반 수', value: classStats.length, gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-500' },
    { label: '필터된 학생', value: filteredStudents.length, gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/25">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold">학생 관리</h1>
              </div>
              <p className="text-muted-foreground pl-14">전체 학생을 관리하고 프로젝트에 할당할 수 있습니다.</p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
            >
              <Upload className="w-4 h-4 mr-2" />
              학생 업로드
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.label}
              className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                    <Users className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Class stats */}
        {classStats.length > 0 && (
          <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>반별 학생 현황</CardTitle>
                </div>
                <div className="flex gap-2">
                  {uniqueGrades.map((grade) => (
                    <Button
                      key={grade}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget({ type: 'grade', grade });
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
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
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors py-1.5"
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
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteTarget({ type: 'class', grade: stat.grade, class: stat.class_number });
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>필터 및 검색</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-64">
                <label className="text-sm font-medium mb-2 block">검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 학생 ID로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-background/50"
                  />
                </div>
              </div>

              <div className="min-w-32">
                <label className="text-sm font-medium mb-2 block">학년</label>
                <select
                  value={selectedGrade ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedGrade(value);
                    setSelectedClass(null);
                  }}
                  className="w-full h-11 px-3 rounded-md border border-border bg-background/50"
                >
                  <option value="">전체</option>
                  {uniqueGrades.map((grade) => (
                    <option key={grade} value={grade}>{grade}학년</option>
                  ))}
                </select>
              </div>

              <div className="min-w-32">
                <label className="text-sm font-medium mb-2 block">반</label>
                <select
                  value={selectedClass ?? ''}
                  onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!selectedGrade}
                  className="w-full h-11 px-3 rounded-md border border-border bg-background/50 disabled:opacity-50"
                >
                  <option value="">전체</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}반</option>
                  ))}
                </select>
              </div>

              <Button variant="outline" onClick={resetFilters} className="h-11">
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>학생 목록</CardTitle>
                <CardDescription>{filteredStudents.length}명의 학생</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">학생이 없습니다</h3>
                <p className="text-muted-foreground mb-4">학생 목록을 업로드하거나 검색 조건을 변경해보세요.</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  학생 업로드
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>학생 ID</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>학년</TableHead>
                      <TableHead>반</TableHead>
                      <TableHead>번호</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.slice(0, 50).map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.grade}학년</TableCell>
                        <TableCell>{student.class_number}반</TableCell>
                        <TableCell>{student.student_number}번</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStudent(student.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredStudents.length > 50 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t border-border/50">
                    {filteredStudents.length - 50}명의 학생이 더 있습니다. 검색 또는 필터를 사용하세요.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              학생 목록 업로드
            </DialogTitle>
            <DialogDescription>
              엑셀 파일로 학생 목록을 업로드하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => document.getElementById('student-upload')?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-primary/50" />
              <p className="font-medium">클릭하여 파일 선택</p>
              <p className="text-sm text-muted-foreground mt-1">
                .xlsx, .xls 파일 지원
              </p>
            </div>
            <Input
              id="student-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">파일 형식</p>
              <p className="text-xs text-muted-foreground">
                첫 번째 행: 학년, 반, 번호, 이름<br />
                예: 1, 1, 1, 홍길동
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-destructive">학생 삭제 확인</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'grade' 
                ? `${deleteTarget.grade}학년의 모든 학생을 삭제하시겠습니까?`
                : `${deleteTarget?.grade}학년 ${deleteTarget?.class}반의 모든 학생을 삭제하시겠습니까?`
              }
              <br />이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
