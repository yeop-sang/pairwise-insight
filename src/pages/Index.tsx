import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
            Pairwise Peer Assessment
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Transform student evaluation with comparative assessment. 
            Use Bradley-Terry modeling to generate reliable rankings from simple pairwise comparisons.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              variant="academic"
              size="xl"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              View Dashboard
            </Button>
            
            <Button
              variant="outline"
              size="xl"
              onClick={() => navigate("/compare-demo")}
              className="flex items-center gap-2"
            >
              <Zap className="h-5 w-5" />
              Try Demo
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Easy Comparisons</h3>
                <p className="text-muted-foreground text-sm">
                  Simple side-by-side interface with keyboard shortcuts. 
                  Students compare pairs quickly and efficiently.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mb-4">
                  <BarChart3 className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Reliable Rankings</h3>
                <p className="text-muted-foreground text-sm">
                  Bradley-Terry statistical modeling provides robust rankings 
                  with confidence intervals and reliability metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg mb-4">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Teacher Control</h3>
                <p className="text-muted-foreground text-sm">
                  Full teacher control over questions, assignments, and settings. 
                  Export data for further analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
