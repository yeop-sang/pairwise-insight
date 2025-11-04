import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Users, 
  BookOpen, 
  BarChart3, 
  Shield,
  Database,
  Activity,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useDataDownload } from '@/hooks/useDataDownload';

interface SystemStats {
  totalTeachers: number;
  totalStudents: number;
  totalProjects: number;
  totalComparisons: number;
  activeProjects: number;
}

interface ProjectData {
  id: string;
  title: string;
  teacher_name: string;
  student_count: number;
  comparison_count: number;
  created_at: string;
  is_active: boolean;
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { downloadProjectData } = useDataDownload();
  const [stats, setStats] = useState<SystemStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalProjects: 0,
    totalComparisons: 0,
    activeProjects: 0
  });
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('관리자 권한이 필요합니다');
      navigate('/dashboard');
      return;
    }

    if (isAdmin) {
      fetchSystemStats();
      fetchAllProjects();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchSystemStats = async () => {
    try {
      // Count teachers (users with teacher role)
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      // Count students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Count projects
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Count active projects
      const { count: activeProjectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Count total comparisons
      const { count: comparisonCount } = await supabase
        .from('comparisons')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalTeachers: teacherRoles?.length || 0,
        totalStudents: studentCount || 0,
        totalProjects: projectCount || 0,
        totalComparisons: comparisonCount || 0,
        activeProjects: activeProjectCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('통계를 불러오는데 실패했습니다');
    }
  };

  const fetchAllProjects = async () => {
    try {
      setLoading(true);

      // Fetch all projects with teacher info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          created_at,
          is_active,
          teacher_id,
          profiles!projects_teacher_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // For each project, get student count and comparison count
      const projectsWithStats = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { count: studentCount } = await supabase
            .from('project_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          const { count: comparisonCount } = await supabase
            .from('comparisons')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            id: project.id,
            title: project.title,
            teacher_name: (project.profiles as any)?.name || 'Unknown',
            student_count: studentCount || 0,
            comparison_count: comparisonCount || 0,
            created_at: project.created_at,
            is_active: project.is_active
          };
        })
      );

      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('프로젝트 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadProject = (projectId: string) => {
    downloadProjectData(projectId);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold">관리자 대시보드</h1>
              <p className="text-muted-foreground">시스템 전체 관리 및 모니터링</p>
            </div>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            교사 대시보드로
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                교사
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                학생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                전체 프로젝트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                활성: {stats.activeProjects}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                총 비교 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalComparisons.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                평균 비교/프로젝트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalProjects > 0 
                  ? Math.round(stats.totalComparisons / stats.totalProjects)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="data" className="space-y-6">
          <TabsList>
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              데이터 다운로드
            </TabsTrigger>
            <TabsTrigger value="projects">
              <BookOpen className="h-4 w-4 mr-2" />
              프로젝트 관리
            </TabsTrigger>
          </TabsList>

          {/* Data Download Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>프로젝트별 데이터 다운로드</CardTitle>
                <CardDescription>
                  각 프로젝트의 상세 비교 데이터를 ZIP 파일로 다운로드할 수 있습니다.
                  다중 평가 시스템에 맞춘 구조화된 데이터를 제공합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{project.title}</h3>
                              <Badge variant={project.is_active ? 'default' : 'secondary'}>
                                {project.is_active ? '활성' : '비활성'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>담당: {project.teacher_name}</span>
                              <span>학생: {project.student_count}명</span>
                              <span>비교: {project.comparison_count}회</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadProject(project.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            ZIP 다운로드
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>전체 프로젝트 통계</CardTitle>
                <CardDescription>
                  시스템의 모든 프로젝트 현황을 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{project.title}</h3>
                              <Badge variant={project.is_active ? 'default' : 'secondary'}>
                                {project.is_active ? '활성' : '비활성'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>담당: {project.teacher_name}</span>
                              <span>학생: {project.student_count}명</span>
                              <span>총 비교: {project.comparison_count}회</span>
                              <span>평균 비교/학생: {project.student_count > 0 ? Math.round(project.comparison_count / project.student_count) : 0}회</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
