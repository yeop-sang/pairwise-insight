import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, CheckCircle, XCircle } from 'lucide-react';
import { StudentComparisonProgress } from '@/components/StudentComparisonProgress';
import { StudentProgressModal } from '@/components/StudentProgressModal';

interface Project {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
}

interface AssignedStudent {
  id: string;
  student_id: string;
  name: string;
  grade: number;
  class_number: number;
  student_number: number;
  has_completed: boolean;
  completed_at: string | null;
  assigned_at: string;
}

export const ProjectAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxQuestions, setMaxQuestions] = useState<number>(5);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user || !id) {
      navigate('/dashboard');
      return;
    }
    fetchProject();
    fetchAssignedStudents();
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

      // 최대 문항 수 계산
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('question_number')
        .eq('project_id', id);

      if (!responsesError && responsesData) {
        const maxQuestionNumber = Math.max(...responsesData.map(r => r.question_number));
        setMaxQuestions(maxQuestionNumber);
      }
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

  const fetchAssignedStudents = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          *,
          students!fk_project_assignments_student_id (
            student_id,
            name,
            grade,
            class_number,
            student_number
          )
        `)
        .eq('project_id', id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(assignment => ({
        id: assignment.id,
        student_id: assignment.students.student_id,
        name: assignment.students.name,
        grade: assignment.students.grade,
        class_number: assignment.students.class_number,
        student_number: assignment.students.student_number,
        has_completed: assignment.has_completed,
        completed_at: assignment.completed_at,
        assigned_at: assignment.assigned_at,
      }));

      setAssignedStudents(formattedData);
    } catch (error) {
      console.error('Error fetching assigned students:', error);
    } finally {
      setLoading(false);
    }
  };

  // 실시간 할당 상태 업데이트를 위한 interval 설정
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(() => {
      fetchAssignedStudents();
    }, 30000); // 30초마다 업데이트

    return () => clearInterval(interval);
  }, [id]);

  const removeAssignment = async (assignmentId: string) => {
    if (!confirm('이 학생의 할당을 취소하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('project_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: '성공',
        description: '학생 할당이 취소되었습니다.',
      });

      fetchAssignedStudents();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: '오류',
        description: '할당 취소에 실패했습니다.',
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

  const completedCount = assignedStudents.filter(s => s.has_completed).length;
  const totalCount = assignedStudents.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 학년/반별 그룹화
  const groupedStudents = assignedStudents.reduce((acc, student) => {
    const key = `${student.grade}학년 ${student.class_number}반`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(student);
    return acc;
  }, {} as Record<string, AssignedStudent[]>);

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
            <p className="text-muted-foreground mt-2">할당된 학생들의 참여 현황</p>
          </div>
          <Badge variant={project.is_active ? "default" : "secondary"}>
            {project.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">할당된 학생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료한 학생</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미완료 학생</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalCount - completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* 학생별 비교 진행 상황 */}
      {totalCount > 0 && (
        <div className="mb-8">
          <StudentComparisonProgress 
            projectId={id!} 
            maxQuestions={maxQuestions}
          />
        </div>
      )}

      {/* 할당된 학생 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>할당된 학생 목록</CardTitle>
          <CardDescription>
            이 프로젝트에 할당된 학생들의 참여 현황을 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {totalCount === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">할당된 학생이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                프로젝트 상세 페이지에서 학생을 할당해주세요.
              </p>
              <Button onClick={() => navigate(`/project/${id}`)}>
                학생 할당하기
              </Button>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {Object.entries(groupedStudents).map(([className, students]) => (
                <div key={className}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    {className} ({students.length}명)
                    <Badge variant="outline" className="ml-2">
                      완료: {students.filter(s => s.has_completed).length}명
                    </Badge>
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>학생 ID</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>번호</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>완료일</TableHead>
                        <TableHead>할당일</TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {students
                         .sort((a, b) => a.student_number - b.student_number)
                         .map((student) => (
                        <TableRow 
                          key={student.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedStudent({ id: student.id, name: student.name })}
                        >
                          <TableCell className="font-mono text-sm">
                            {student.student_id}
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.student_number}번</TableCell>
                          <TableCell>
                            <Badge variant={student.has_completed ? "default" : "secondary"}>
                              {student.has_completed ? '완료' : '미완료'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {student.completed_at 
                              ? new Date(student.completed_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {new Date(student.assigned_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAssignment(student.id);
                              }}
                            >
                              할당 취소
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Progress Modal */}
      {selectedStudent && (
        <StudentProgressModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          projectId={id!}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          maxQuestions={maxQuestions}
        />
      )}
    </div>
  );
};