import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Plus, Users, BarChart3, Clock, FileText, Trash2, ArrowRight, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <p className="text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  // Calculate total stats from real data
  const totalStats = projects.reduce(
    (acc, project) => ({
      totalProjects: acc.totalProjects + 1,
      activeComparisons: acc.activeComparisons + (project.is_active ? 1 : 0),
      totalResponses: acc.totalResponses + 0,
      totalComparisons: acc.totalComparisons + 0,
    }),
    { totalProjects: 0, activeComparisons: 0, totalResponses: 0, totalComparisons: 0 }
  );

  const statCards = [
    { 
      icon: FileText, 
      value: totalStats.totalProjects, 
      label: "전체 프로젝트",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-500"
    },
    { 
      icon: Clock, 
      value: totalStats.activeComparisons, 
      label: "활성 세션",
      gradient: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-500"
    },
    { 
      icon: Users, 
      value: totalStats.totalResponses, 
      label: "전체 응답",
      gradient: "from-emerald-500/10 to-green-500/10",
      iconColor: "text-emerald-500"
    },
    { 
      icon: BarChart3, 
      value: totalStats.totalComparisons, 
      label: "완료된 비교",
      gradient: "from-violet-500/10 to-purple-500/10",
      iconColor: "text-violet-500"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-12 animate-fade-in">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/25">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                교사 대시보드
              </h1>
            </div>
            <p className="text-muted-foreground text-lg pl-14">
              안녕하세요, <span className="font-medium text-foreground">{profile?.name}</span>님!
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/student-management')}
              className="backdrop-blur-sm bg-card/50 border-border/50 hover:bg-card/80 transition-all"
            >
              <Users className="h-4 w-4 mr-2" />
              학생 관리
            </Button>
            <Button 
              onClick={() => navigate("/create-project")} 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 프로젝트
            </Button>
            <Button 
              variant="ghost" 
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              로그아웃
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.label}
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl animate-slide-up" style={{ animationDelay: '400ms' }}>
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                내 프로젝트
              </CardTitle>
              {projects.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {projects.length}개
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {projects.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  첫 번째 동료평가 프로젝트를 생성하여 학생들의 평가를 시작해보세요.
                </p>
                <Button 
                  onClick={() => navigate("/create-project")}
                  className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  새 프로젝트 생성
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="group relative flex items-center justify-between p-5 rounded-xl border border-border/50 bg-gradient-to-r from-transparent to-transparent hover:from-primary/5 hover:to-transparent hover:border-primary/30 cursor-pointer transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${(index + 5) * 50}ms` }}
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                        <Badge 
                          variant={project.is_active ? "default" : "secondary"}
                          className={project.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}
                        >
                          {project.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description || "설명 없음"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(project.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteProject(project.id, e)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
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
