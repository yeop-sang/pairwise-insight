import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Plus, BookOpen, Power, FileText, BarChart3, MessageSquare, Sparkles, Trophy } from 'lucide-react';
import { ScoreAggregation } from '@/components/ScoreAggregation';
import { ExplainabilityPanel } from '@/components/ExplainabilityPanel';
import { StudentFeedbackPanel } from '@/components/StudentFeedbackPanel';
import { ObjectiveKingCeremony } from '@/components/ObjectiveKingCeremony';

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

  const [project, setProject] = useState<Project | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCeremony, setShowCeremony] = useState(false);

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
    if (!id || !user) return;

    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('grade, class_number')
        .eq('teacher_id', user.id)
        .order('grade')
        .order('class_number');

      if (studentsError) throw studentsError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`students (grade, class_number)`)
        .eq('project_id', id);

      if (assignmentsError) throw assignmentsError;

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

  // 학생 정보로 student_code 생성 (학년 + 반(2자리) + 번호(2자리))
  const generateStudentCode = (studentData: { grade: number; class_number: number; student_number: number }): string => {
    const grade = studentData.grade || 1;
    const classNum = (studentData.class_number || 1).toString().padStart(2, '0');
    const number = (studentData.student_number || 1).toString().padStart(2, '0');
    return `${grade}${classNum}${number}`;
  };

  const assignClassToProject = async (grade: number, classNumber: number) => {
    if (!id || !user) return;

    try {
      // 1. 해당 반의 모든 학생 조회
      const { data: allStudents, error: allStudentsError } = await supabase
        .from('students')
        .select('id, student_id, name, grade, class_number, student_number')
        .eq('teacher_id', user.id)
        .eq('grade', grade)
        .eq('class_number', classNumber);

      if (allStudentsError) throw allStudentsError;

      if (!allStudents || allStudents.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반에 등록된 학생이 없습니다.`,
        });
        return;
      }

      // 2. 이 프로젝트에 등록된 응답들의 student_code 목록 조회
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('student_code')
        .eq('project_id', id);

      if (responsesError) throw responsesError;

      const responseStudentCodes = new Set((responsesData || []).map(r => r.student_code));

      // 3. 응답이 있는 학생만 필터링
      const studentsWithResponses = allStudents.filter(student => {
        const studentCode = generateStudentCode(student);
        return responseStudentCodes.has(studentCode);
      });

      if (studentsWithResponses.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반에 응답이 등록된 학생이 없습니다. 먼저 학생 응답을 업로드해주세요.`,
        });
        return;
      }

      // 4. 이미 할당된 학생 제외
      const { data: assignedStudents, error: assignedError } = await supabase
        .from('project_assignments')
        .select('student_id')
        .eq('project_id', id);

      if (assignedError) throw assignedError;

      const assignedStudentIds = (assignedStudents || []).map(a => a.student_id);
      const unassignedStudents = studentsWithResponses.filter(student => 
        !assignedStudentIds.includes(student.id)
      );

      if (unassignedStudents.length === 0) {
        toast({
          title: '알림',
          description: `${grade}학년 ${classNumber}반의 응답이 있는 학생은 모두 이미 할당되었습니다.`,
        });
        return;
      }

      // 5. 할당 실행
      const assignments = unassignedStudents.map(student => ({
        project_id: id,
        student_id: student.id,
      }));

      const { error: assignError } = await supabase
        .from('project_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      const skippedCount = allStudents.length - studentsWithResponses.length;
      const skippedMessage = skippedCount > 0 
        ? ` (응답 없는 학생 ${skippedCount}명 제외)` 
        : '';

      toast({
        title: '성공',
        description: `${grade}학년 ${classNumber}반 학생 ${unassignedStudents.length}명이 할당되었습니다.${skippedMessage}`,
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
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', user.id)
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <p className="text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const totalStudents = classes.reduce((sum, cls) => sum + cls.student_count, 0);
  const totalAssigned = classes.reduce((sum, cls) => sum + cls.assigned_count, 0);

  const getActualQuestionCount = () => {
    if (!project?.question) return 1;
    try {
      const questions = JSON.parse(project.question);
      return Object.keys(questions).length;
    } catch (error) {
      return project.num_questions || 1;
    }
  };

  const actualQuestionCount = getActualQuestionCount();

  const statCards = [
    { label: '전체 학생', value: totalStudents, icon: Users, gradient: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-500' },
    { label: '할당된 학생', value: totalAssigned, icon: Users, gradient: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-500' },
    { label: '할당률', value: `${totalStudents > 0 ? Math.round((totalAssigned / totalStudents) * 100) : 0}%`, icon: BarChart3, gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-500' },
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
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <Badge 
                  className={project.is_active 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-muted text-muted-foreground'
                  }
                >
                  {project.is_active ? '활성' : '비활성'}
                </Badge>
              </div>
              <p className="text-muted-foreground pl-14">{project.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={toggleProjectStatus}
                variant="outline"
                className="backdrop-blur-sm bg-card/50"
              >
                <Power className="w-4 h-4 mr-2" />
                {project.is_active ? '비활성화' : '활성화'}
              </Button>
              <Button
                onClick={() => navigate(`/project/${id}/assignments`)}
                variant="outline"
                className="backdrop-blur-sm bg-card/50"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                할당 현황
              </Button>
              <Button
                onClick={() => setShowCeremony(true)}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-500/25"
              >
                <Trophy className="w-4 h-4 mr-2" />
                객관왕찾기
              </Button>
            </div>
          </div>

          {/* 객관왕 시상식 모달 */}
          <ObjectiveKingCeremony
            open={showCeremony}
            onOpenChange={setShowCeremony}
            projectId={id!}
          />
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.label}
              className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg`}></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Questions Card */}
        <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>프로젝트 문항</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              try {
                const questions = JSON.parse(project.question || '{}');
                return (
                  <div className="space-y-3">
                    {Object.entries(questions).map(([key, value]) => (
                      <div key={key} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <span className="text-sm font-medium text-primary">문항 {key}</span>
                        <p className="mt-1">{value as string}</p>
                      </div>
                    ))}
                  </div>
                );
              } catch {
                return <p>{project.question}</p>;
              }
            })()}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="assignment" className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="assignment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              학생 할당
            </TabsTrigger>
            <TabsTrigger value="scores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />
              점수 집계
            </TabsTrigger>
            <TabsTrigger value="keywords" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              키워드
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              피드백
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignment" className="mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>학급별 할당 관리</CardTitle>
                <CardDescription>
                  학년과 반을 선택하여 프로젝트에 할당하거나 할당을 취소할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">등록된 학생이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">먼저 학생 관리에서 학생을 등록해주세요.</p>
                    <Button onClick={() => navigate('/student-management')}>
                      <Plus className="w-4 h-4 mr-2" />
                      학생 관리로 이동
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                      <Card key={`${cls.grade}-${cls.class_number}`} className="border-border/50 bg-background/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">{cls.grade}학년 {cls.class_number}반</h3>
                            <Badge variant="outline" className="bg-background">
                              {cls.assigned_count}/{cls.student_count}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(cls.assigned_count / cls.student_count) * 100}%` }}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              {cls.assigned_count < cls.student_count && (
                                <Button
                                  size="sm"
                                  onClick={() => assignClassToProject(cls.grade, cls.class_number)}
                                  className="flex-1 bg-gradient-to-r from-primary to-primary/90"
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
                                  취소
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scores" className="mt-6">
            <ScoreAggregation projectId={id!} maxQuestions={actualQuestionCount} />
          </TabsContent>

          <TabsContent value="keywords" className="mt-6">
            <ExplainabilityPanel projectId={id!} maxQuestions={actualQuestionCount} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <StudentFeedbackPanel projectId={id!} maxQuestions={actualQuestionCount} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
