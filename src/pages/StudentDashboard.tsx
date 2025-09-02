import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Users, ArrowRight } from "lucide-react";

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
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(false); // 임시로 로딩 false

  // 임시 학생 데이터
  const mockStudent = {
    name: "테스트 학생",
    id: "student-123"
  };

  // 임시 프로젝트 데이터
  const mockProjects: AssignedProject[] = [
    {
      id: "project-1",
      title: "영어 에세이 비교평가",
      description: "학생들의 영어 에세이를 비교하여 평가하는 프로젝트입니다.",
      question: "다음 두 에세이 중 어느 것이 더 논리적이고 설득력이 있나요?",
      rubric: "논리성, 구조, 언어 사용, 창의성을 기준으로 평가하세요.",
      created_at: "2024-01-15",
      comparison_count: 5,
      total_responses: 24
    },
    {
      id: "project-2", 
      title: "수학 문제 해결 과정 평가",
      description: "학생들의 수학 문제 해결 과정을 평가합니다.",
      question: "어느 학생의 문제 해결 과정이 더 체계적이고 명확한가요?",
      rubric: "문제 이해, 해결 과정, 답의 정확성을 기준으로 평가하세요.",
      created_at: "2024-01-10",
      comparison_count: 2,
      total_responses: 18
    }
  ];

  const handleStartComparison = (projectId: string) => {
    navigate(`/compare/${projectId}`);
  };

  const handleSignOut = () => {
    navigate("/");
  };


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">로딩 중...</p>
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
            안녕하세요, {mockStudent.name}님! 할당된 비교평가 프로젝트를 확인하세요.
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>

      {mockProjects.length === 0 ? (
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
          {mockProjects.map((project) => (
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