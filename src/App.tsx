import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StudentAuthProvider } from "@/hooks/useStudentAuth";
import Index from "./pages/Index";
import { Dashboard } from "./pages/Dashboard";
import { CreateProject } from "./pages/CreateProject";
import { StudentDashboard } from "./pages/StudentDashboard";
import { ComparisonSession } from "./pages/ComparisonSession";
import { ProjectDetail } from "./pages/ProjectDetail";
import { StudentManagement } from "./pages/StudentManagement";
import { ProjectAssignment } from "./pages/ProjectAssignment";
import { StudentLogin } from "./pages/StudentLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StudentAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/student-login" element={<StudentLogin />} />
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/student-management" element={<StudentManagement />} />
              <Route path="/create-project" element={<CreateProject />} />
              <Route path="/compare/:projectId" element={<ComparisonSession />} />
              <Route path="/compare-demo" element={<ComparisonSession />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/project/:id/assignments" element={<ProjectAssignment />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StudentAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
