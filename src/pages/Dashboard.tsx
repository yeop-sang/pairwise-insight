import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, BarChart3, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  title: string;
  course: string;
  createdAt: string;
  status: "draft" | "collecting" | "comparing" | "closed";
  totalResponses: number;
  totalComparisons: number;
  totalReviewers: number;
}

// Mock data - in real app this would come from API
const mockProjects: Project[] = [
  {
    id: "1",
    title: "에세이 분석: 기후 변화 해결책",
    course: "환경과학 101",
    createdAt: "2024-01-15",
    status: "comparing",
    totalResponses: 24,
    totalComparisons: 156,
    totalReviewers: 8,
  },
  {
    id: "2", 
    title: "발표: 역사적 인물",
    course: "역사학 201",
    createdAt: "2024-01-10",
    status: "collecting",
    totalResponses: 18,
    totalComparisons: 0,
    totalReviewers: 0,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "secondary";
    case "collecting":
      return "warning";
    case "comparing":
      return "default";
    case "closed":
      return "success";
    default:
      return "secondary";
  }
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const totalStats = {
    totalProjects: mockProjects.length,
    activeComparisons: mockProjects.filter(p => p.status === "comparing").length,
    totalResponses: mockProjects.reduce((sum, p) => sum + p.totalResponses, 0),
    totalComparisons: mockProjects.reduce((sum, p) => sum + p.totalComparisons, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              쌍대비교 동료평가
            </h1>
            <p className="text-lg text-muted-foreground">
              비교 평가 프로젝트를 관리하세요
            </p>
          </div>
          
          <Button
            variant="academic"
            size="lg"
            onClick={() => navigate("/create-project")}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            새 프로젝트
          </Button>
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

        {/* Projects Table */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>최근 프로젝트</CardTitle>
            <CardDescription>
              쌍대비교 프로젝트를 관리하고 진행 상황을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {project.course} • 생성일 {project.createdAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{project.totalResponses}</p>
                      <p className="text-xs text-muted-foreground">응답</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-semibold">{project.totalComparisons}</p>
                      <p className="text-xs text-muted-foreground">비교</p>
                    </div>

                    <Badge variant={getStatusColor(project.status) as any}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};