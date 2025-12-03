import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BookOpen, Clock, CheckCircle, LogOut, User, Sparkles, ArrowRight, GraduationCap } from 'lucide-react';
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
        const targetComparisons = 25 * (project.num_questions || 1);
        
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

  const getStatusConfig = (project: Project) => {
    const status = getProgressStatus(project);
    switch (status) {
      case 'completed':
        return { 
          label: '완료', 
          className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          icon: CheckCircle,
          gradient: 'from-emerald-500/10 to-green-500/10'
        };
      case 'in_progress':
        return { 
          label: '진행중', 
          className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          icon: Clock,
          gradient: 'from-amber-500/10 to-orange-500/10'
        };
      case 'not_started':
        return { 
          label: '시작 전', 
          className: 'bg-muted text-muted-foreground',
          icon: BookOpen,
          gradient: 'from-muted/50 to-muted/30'
        };
    }
  };

  const getProgressPercent = (project: Project) => {
    if (!project.target_comparisons) return 0;
    return Math.min(100, Math.round(((project.comparison_count || 0) / project.target_comparisons) * 100));
  };

  if (!student || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">
            {!student ? '로그인 정보를 확인하는 중...' : '프로젝트를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 animate-fade-in">
          <Link 
            to="/student-login" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">로그인으로</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">
                {student.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {student.grade}-{student.class_number}-{student.student_number}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="mb-12 animate-slide-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg shadow-primary/25">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                안녕하세요, {student.name}님!
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                할당된 프로젝트를 확인하고 평가에 참여하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {projects.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{projects.length}</p>
                <p className="text-xs text-muted-foreground">할당된 프로젝트</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {projects.filter(p => getProgressStatus(p) === 'in_progress').length}
                </p>
                <p className="text-xs text-muted-foreground">진행 중</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {projects.filter(p => p.has_completed).length}
                </p>
                <p className="text-xs text-muted-foreground">완료</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects */}
        {projects.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                <Clock className="w-12 h-12 text-primary/40" />
              </div>
              <CardTitle className="text-2xl mb-3">할당된 프로젝트가 없습니다</CardTitle>
              <CardDescription className="text-base max-w-md">
                선생님이 프로젝트를 할당하면 여기에 표시됩니다.
                <br />잠시만 기다려주세요.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => {
              const statusConfig = getStatusConfig(project);
              const progressPercent = getProgressPercent(project);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card 
                  key={project.id} 
                  className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${(index + 2) * 100}ms` }}
                >
                  {/* Status gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1.5 line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge className={statusConfig.className}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-4">
                    {/* Progress bar */}
                    {!project.has_completed && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">진행률</span>
                          <span className="font-medium">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {project.comparison_count || 0} / {project.target_comparisons} 비교 완료
                        </p>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className={`w-full group/btn ${
                        project.has_completed 
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20' 
                          : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20'
                      }`}
                      variant={project.has_completed ? "outline" : "default"}
                      onClick={() => navigate(`/compare/${project.id}`)}
                      disabled={project.has_completed || !project.is_active}
                    >
                      {project.has_completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          평가 완료
                        </>
                      ) : !project.is_active ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          평가 종료됨
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          {(project.comparison_count || 0) > 0 ? "이어서 평가하기" : "평가 시작하기"}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
