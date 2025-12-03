import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, CheckCircle, LogOut, User } from 'lucide-react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  question: string;
  rubric: string;
  created_at: string;
  is_active: boolean;
  has_completed?: boolean;
  comparison_count?: number;
  target_comparisons?: number;
}

type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export const StudentDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { student, logout } = useStudentAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    if (!student) return;
    
    try {
      // Get projects with completion status
      const { data: assignedProjects, error: assignmentError } = await supabase
        .from('project_assignments')
        .select('project_id, has_completed')
        .eq('student_id', student.id);
      
      if (assignmentError) throw assignmentError;
      
      if (!assignedProjects || assignedProjects.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }
      
      const projectIds = assignedProjects.map(p => p.project_id);
      
      // Get the actual project details
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);
      
      if (projectsError) throw projectsError;
      
      // Get comparison counts for each project
      const { data: comparisonsData, error: comparisonsError } = await supabase
        .from('comparisons')
        .select('project_id')
        .eq('student_id', student.id)
        .in('project_id', projectIds);
      
      if (comparisonsError) throw comparisonsError;
      
      // Count comparisons per project
      const comparisonCounts: Record<string, number> = {};
      comparisonsData?.forEach(c => {
        comparisonCounts[c.project_id] = (comparisonCounts[c.project_id] || 0) + 1;
      });
      
      // Merge completion status with project data
      const projectsWithCompletion = projectsData?.map(project => {
        const assignment = assignedProjects.find(a => a.project_id === project.id);
        const comparisonCount = comparisonCounts[project.id] || 0;
        const targetComparisons = 15 * (project.num_questions || 1); // 15 per question
        
        return {
          ...project,
          has_completed: assignment?.has_completed || comparisonCount >= targetComparisons,
          comparison_count: comparisonCount,
          target_comparisons: targetComparisons
        };
      }) || [];
      
      setProjects(projectsWithCompletion);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!student) {
      navigate('/student-login');
      return;
    }
    fetchProjects();
  }, [student, navigate]);

  const handleLogout = () => {
    logout();
    toast({
      title: '로그아웃',
      description: '성공적으로 로그아웃되었습니다.',
    });
  };

  const getProgressStatus = (project: Project): ProgressStatus => {
    if (project.has_completed) return 'completed';
    if ((project.comparison_count || 0) > 0) return 'in_progress';
    return 'not_started';
  };

  const getStatusBadge = (project: Project) => {
    const status = getProgressStatus(project);
    switch (status) {
      case 'completed':
        return { label: '진행 완료', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' };
      case 'in_progress':
        return { label: '진행중', variant: 'secondary' as const, className: 'bg-amber-500 hover:bg-amber-600 text-white' };
      case 'not_started':
        return { label: '진행 이전', variant: 'outline' as const, className: '' };
    }
  };

  if (!student || loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!student ? '로그인 정보를 확인하는 중...' : '프로젝트를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/student-login" 
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인으로 돌아가기
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{student.name} ({student.grade}학년 {student.class_number}반 {student.student_number}번)</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">안녕하세요, {student.name}님!</h1>
          <p className="text-muted-foreground">
            할당된 프로젝트를 확인하고 평가에 참여하세요.
          </p>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mb-6" />
              <CardTitle className="text-xl mb-2">할당된 프로젝트가 없습니다</CardTitle>
              <CardDescription className="text-center">
                선생님이 프로젝트를 할당할 때까지 기다려주세요.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                      {project.description && (
                        <CardDescription>{project.description}</CardDescription>
                      )}
                    </div>
                    <Badge 
                      variant={getStatusBadge(project).variant}
                      className={getStatusBadge(project).className}
                    >
                      {getStatusBadge(project).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/compare/${project.id}`)}
                      disabled={project.has_completed || !project.is_active}
                    >
                      {project.has_completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          평가 완료됨
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          {!project.is_active ? "평가 종료됨" : (project.comparison_count || 0) > 0 ? "평가 계속하기" : "비교 평가 시작"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};