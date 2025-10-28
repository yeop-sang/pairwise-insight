import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, BarChart3, Clock, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  title: string;
  description?: string;
  question: string;
  rubric?: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}


export const Dashboard = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      
      if (profile?.role === 'student') {
        navigate("/student-dashboard");
        return;
      }
      
      // Only fetch projects if user exists and is teacher (or no profile yet)
      if (user && (!profile || profile.role === 'teacher')) {
        fetchProjects();
      }
    }
  }, [user, profile, authLoading, navigate]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      // Remove from local state
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  // Calculate total stats from real data
  const totalStats = projects.reduce(
    (acc, project) => ({
      totalProjects: acc.totalProjects + 1,
      activeComparisons: acc.activeComparisons + (project.is_active ? 1 : 0),
      totalResponses: acc.totalResponses + 0, // TODO: Get actual counts
      totalComparisons: acc.totalComparisons + 0, // TODO: Get actual counts
    }),
    { totalProjects: 0, activeComparisons: 0, totalResponses: 0, totalComparisons: 0 }
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">교사 대시보드</h1>
            <p className="text-muted-foreground mt-2">
              안녕하세요, {profile?.name}님! 프로젝트를 관리하고 비교 평가 결과를 확인하세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/student-management')}>
              <Users className="h-4 w-4 mr-2" />
              학생 관리
            </Button>
            <Button 
              onClick={() => navigate("/create-project")} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              새 프로젝트
            </Button>
            <Button variant="outline" onClick={async () => {
              await signOut();
              navigate('/');
            }}>
              로그아웃
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalProjects}</p>
                  <p className="text-sm text-muted-foreground">전체 프로젝트</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.activeComparisons}</p>
                  <p className="text-sm text-muted-foreground">활성 세션</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalResponses}</p>
                  <p className="text-sm text-muted-foreground">전체 응답</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.totalComparisons}</p>
                  <p className="text-sm text-muted-foreground">완료된 비교</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              내 프로젝트
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  첫 번째 동료평가 프로젝트를 생성해보세요.
                </p>
                <Button onClick={() => navigate("/create-project")}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 프로젝트 생성
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">{project.description || "설명 없음"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="text-center">
                        <Badge variant={project.is_active ? "default" : "secondary"}>
                          {project.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <div className="text-center min-w-20">
                        <p className="text-xs">{new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => deleteProject(project.id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};