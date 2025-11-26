import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Plus, BookOpen, Power, Trophy } from 'lucide-react';
import { ScoreAggregation } from '@/components/ScoreAggregation';
import { ScoreVisualization } from '@/components/ScoreVisualization';
import { ExplainabilityPanel } from '@/components/ExplainabilityPanel';
import { useScoreAggregation } from '@/hooks/useScoreAggregation';

interface Project {
  id: string;
  title: string;
  description: string;
  question: string;
  is_active: boolean;
  created_at: string;
  num_questions: number;
}

interface ClassInfo {
  grade: number;
  class_number: number;
  student_count: number;
  assigned_count: number;
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { scores } = useScoreAggregation();

  const [project, setProject] = useState<Project | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      navigate('/');
      return;
    }
    fetchProject();
    fetchClassInfo();
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

  const fetchClassInfo = async () => {
    if (!id) return;

    try {
      // 전체 학생 수 (학년/반별)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('grade, class_number')
        .order('grade')
        .order('class_number');

      if (studentsError) throw studentsError;

      // 이미 할당된 학생 수 (학년/반별)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`
          students!fk_project_assignments_student_id (
            grade,
            class_number
          )
        `)
        .eq('project_id', id);

      if (assignmentsError) throw assignmentsError;

      // 학년/반별 통계 계산
      const classStats = (studentsData || []).reduce((acc, student) => {
        const key = `${student.grade}-${student.class_number}`;
        if (!acc[key]) {
          acc[key] = {
            grade: student.grade,
            class_number: student.class_number,
            student_count: 0,
            assigned_count: 0
          };
        }
        acc[key].student_count++;
        return acc;
      }, {} as Record<string, ClassInfo>);

      // 할당된 학생 수 계산
      (assignmentsData || []).forEach(assignment => {
        if (assignment.students) {
          const key = `${assignment.students.grade}-${assignment.students.class_number}`;
          if (classStats[key]) {
            classStats[key].assigned_count++;
          }
        }
      });

      setClasses(Object.values(classStats).sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.class_number - b.class_number;
      }));
    } catch (error) {
      console.error('Error fetching class info:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignClassToProject = async (grade: number, classNumber: number) => {
    if (!id || !user) return;

    try {
      // 먼저 해당 학년/반의 학생들이 존재하는지 확인
      const { data: allStudents, error: allStudentsError } = await supabase
        .from('students')
        .select('id, student_id, name, grade, class_number')
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (allStudentsError) {
        throw allStudentsError;
      }

      if (!allStudents || allStudents.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반에 등록된 학생이 없습니다. 먼저 학생 관리에서 학생을 등록해주세요.`,
        });
        return;
      }

      // 이미 할당된 학생들의 ID 가져오기
      const { data: assignedStudents, error: assignedError } = await supabase
        .from('project_assignments')
        .select('student_id')
        .eq('project_id', id);

      if (assignedError) {
        throw assignedError;
      }

      const assignedStudentIds = (assignedStudents || []).map(a => a.student_id);

      // 미할당 학생들 필터링
      const unassignedStudents = allStudents.filter(student => 
        !assignedStudentIds.includes(student.id)
      );

      if (unassignedStudents.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반의 모든 학생이 이미 할당되었습니다.`,
        });
        return;
      }

      // 프로젝트에 학생들 할당
      const assignments = unassignedStudents.map(student => ({
        project_id: id,
        student_id: student.id,
      }));

      const { error: assignError } = await supabase
        .from('project_assignments')
        .insert(assignments);

      if (assignError) {
        throw assignError;
      }

      toast({
        title: '성공',
        description: `${grade}학년 ${classNumber}반 학생 ${unassignedStudents.length}명이 할당되었습니다.`,
      });

      fetchClassInfo();
    } catch (error: any) {
      console.error('Error assigning class to project:', error);
      toast({
        title: '오류',
        description: error.message || '학생 할당에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const removeClassFromProject = async (grade: number, classNumber: number) => {
    if (!id || !confirm(`${grade}학년 ${classNumber}반의 모든 할당을 취소하시겠습니까?`)) return;

    try {
      // 해당 학년/반 학생들의 할당 취소
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (studentsError) throw studentsError;

      const studentIds = (studentsData || []).map(s => s.id);

      const { error: removeError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', id)
        .in('student_id', studentIds);

      if (removeError) throw removeError;

      toast({
        title: '성공',
        description: `${grade}학년 ${classNumber}반의 할당이 취소되었습니다.`,
      });

      fetchClassInfo();
    } catch (error: any) {
      console.error('Error removing class assignment:', error);
      toast({
        title: '오류',
        description: error.message || '할당 취소에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const toggleProjectStatus = async () => {
    if (!id || !project) return;

    try {
      const newStatus = !project.is_active;
      const { error } = await supabase
        .from('projects')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;

      setProject({ ...project, is_active: newStatus });
      
      toast({
        title: '성공',
        description: `프로젝트가 ${newStatus ? '활성화' : '비활성화'}되었습니다.`,
      });
    } catch (error: any) {
      console.error('Error toggling project status:', error);
      toast({
        title: '오류',
        description: error.message || '프로젝트 상태 변경에 실패했습니다.',
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

  const totalStudents = classes.reduce((sum, cls) => sum + cls.student_count, 0);
  const totalAssigned = classes.reduce((sum, cls) => sum + cls.assigned_count, 0);

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
          <div className="flex gap-2">
            <Badge variant={project.is_active ? "default" : "secondary"}>
              {project.is_active ? '활성' : '비활성'}
            </Badge>
            <Button
              onClick={toggleProjectStatus}
              variant={project.is_active ? "default" : "outline"}
              size="sm"
            >
              <Power className="w-4 h-4 mr-2" />
              {project.is_active ? '비활성화' : '활성화'}
            </Button>
            <Button
              onClick={() => navigate(`/results/${id}`)}
              variant="outline"
              size="sm"
            >
              <Trophy className="w-4 h-4 mr-2" />
              비교 결과 보기
            </Button>
            <Button
              onClick={() => navigate(`/project/${id}/assignments`)}
              variant="outline"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              할당 현황 보기
            </Button>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">할당된 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">할당률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStudents > 0 ? Math.round((totalAssigned / totalStudents) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트 질문 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>프로젝트 질문</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{project.question}</p>
        </CardContent>
      </Card>

      {/* 탭 */}
      <Tabs defaultValue="assignment" className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignment">학생 할당</TabsTrigger>
          <TabsTrigger value="scores">점수 집계</TabsTrigger>
          <TabsTrigger value="visualization">점수 시각화</TabsTrigger>
          <TabsTrigger value="explainability">Explainability</TabsTrigger>
        </TabsList>

        <TabsContent value="assignment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>학급별 할당 관리</CardTitle>
              <CardDescription>
                학년과 반을 선택하여 프로젝트에 할당하거나 할당을 취소할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">등록된 학생이 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    먼저 학생 관리에서 학생을 등록해주세요.
                  </p>
                  <Button onClick={() => navigate('/student-management')}>
                    <Plus className="w-4 h-4 mr-2" />
                    학생 관리로 이동
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {classes.map((cls) => (
                    <Card key={`${cls.grade}-${cls.class_number}`} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          {cls.grade}학년 {cls.class_number}반
                        </h3>
                        <Badge variant="outline">
                          {cls.assigned_count}/{cls.student_count}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          전체: {cls.student_count}명, 할당: {cls.assigned_count}명
                        </div>
                        
                        <div className="flex gap-2">
                          {cls.assigned_count < cls.student_count && (
                            <Button
                              size="sm"
                              onClick={() => assignClassToProject(cls.grade, cls.class_number)}
                              className="flex-1"
                            >
                              할당
                            </Button>
                          )}
                          
                          {cls.assigned_count > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeClassFromProject(cls.grade, cls.class_number)}
                              className="flex-1"
                            >
                              할당 취소
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="mt-6">
          <ScoreAggregation
            projectId={id!}
            maxQuestions={project?.num_questions || 5}
          />
        </TabsContent>

        <TabsContent value="visualization" className="mt-6">
          <ScoreVisualization
            scores={scores}
            selectedQuestions={Array.from({ length: project?.num_questions || 5 }, (_, i) => i + 1)}
          />
        </TabsContent>

        <TabsContent value="explainability" className="mt-6">
          <ExplainabilityPanel
            projectId={id!}
            maxQuestions={project?.num_questions || 5}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};