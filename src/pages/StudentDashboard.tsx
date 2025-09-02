import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AssignedProject {
  id: string;
  title: string;
  description: string;
  question: string;
  rubric: string;
  created_at: string;
  comparison_count: number;
  total_responses: number;
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      
      if (profile?.role === 'teacher') {
        navigate("/dashboard");
        return;
      }
      
      if (user && (!profile || profile.role === 'student')) {
        fetchAssignedProjects();
      }
    }
  }, [user, profile, authLoading, navigate]);

  const fetchAssignedProjects = async () => {
    try {
      // Get projects assigned to this student
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          projects!inner (
            id,
            title,
            description,
            question,
            rubric,
            created_at,
            is_active
          )
        `)
        .eq('student_id', user?.id);

      if (assignmentsError) throw assignmentsError;

      // Get comparison counts for each project
      const projectsData = await Promise.all(
        (assignments || []).map(async (assignment: any) => {
          const project = assignment.projects;
          
          // Count total responses for this project
          const { count: totalResponses } = await supabase
            .from('student_responses')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          // Count comparisons made by this student for this project
          const { count: comparisonCount } = await supabase
            .from('comparisons')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('student_id', user?.id);

          return {
            id: project.id,
            title: project.title,
            description: project.description,
            question: project.question,
            rubric: project.rubric,
            created_at: project.created_at,
            comparison_count: comparisonCount || 0,
            total_responses: totalResponses || 0
          };
        })
      );

      setProjects(projectsData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "프로젝트 조회 실패",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartComparison = (projectId: string) => {
    navigate(`/compare/${projectId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">내 프로젝트</h1>
          <p className="text-muted-foreground mt-2">
            안녕하세요, {profile?.name || '학생'}님! 할당된 비교평가 프로젝트를 확인하세요.
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">할당된 프로젝트가 없습니다</h3>
            <p className="text-muted-foreground">
              교사가 프로젝트를 할당할 때까지 기다려주세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-medium transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">평가 질문:</h4>
                    <p className="text-sm text-muted-foreground">{project.question}</p>
                  </div>

                  {project.rubric && (
                    <div className="bg-accent p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">평가 기준:</h4>
                      <p className="text-sm text-muted-foreground">{project.rubric}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{project.total_responses}개 응답</span>
                    </div>
                    <div className="text-primary font-medium">
                      {project.comparison_count}번 비교 완료
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleStartComparison(project.id)}
                  >
                    비교 시작
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};