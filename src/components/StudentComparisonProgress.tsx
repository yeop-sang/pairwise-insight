import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Target, User, Activity } from "lucide-react";

interface StudentProgressData {
  student_id: string;
  student_name: string;
  student_code: string;
  question_1_progress: number;
  question_2_progress: number;
  question_3_progress: number;
  question_4_progress: number;
  question_5_progress: number;
  total_comparisons: number;
  current_question: number;
  is_active: boolean;
  last_activity: string | null;
}

interface StudentComparisonProgressProps {
  projectId: string;
  maxQuestions: number;
}

export const StudentComparisonProgress = ({ projectId, maxQuestions }: StudentComparisonProgressProps) => {
  const [progressData, setProgressData] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
    
    // 실시간 업데이트를 위한 interval
    const interval = setInterval(fetchProgressData, 10000); // 10초마다
    
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchProgressData = async () => {
    try {
      // 프로젝트에 할당된 학생들 조회
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select(`
          student_id,
          students!fk_project_assignments_student_id (
            student_id,
            name
          )
        `)
        .eq('project_id', projectId);

      if (assignmentsError) throw assignmentsError;

      const progressPromises = assignments?.map(async (assignment) => {
        const studentId = assignment.student_id;
        const studentName = assignment.students?.name || '';
        const studentCode = assignment.students?.student_id || '';

        // 각 문항별 비교 진행 상황 조회
        const questionProgress = [];
        let totalComparisons = 0;
        let currentQuestion = 1;
        let lastActivity = null;

        for (let q = 1; q <= maxQuestions; q++) {
          // 해당 문항의 응답들 조회
          const { data: responses } = await supabase
            .from('student_responses')
            .select('id')
            .eq('project_id', projectId)
            .eq('question_number', q);

          if (responses && responses.length > 0) {
            const responseIds = responses.map(r => r.id);
            
            // 해당 학생이 이 문항에서 한 비교 개수 조회
            const { data: comparisons } = await supabase
              .from('comparisons')
              .select('created_at')
              .eq('project_id', projectId)
              .eq('student_id', studentId)
              .in('response_a_id', responseIds)
              .in('response_b_id', responseIds)
              .order('created_at', { ascending: false });

            const questionComparisons = comparisons?.length || 0;
            questionProgress.push(Math.min(100, (questionComparisons / 15) * 100));
            totalComparisons += questionComparisons;

            // 현재 문항 판단 (15개 미만이면 현재 문항)
            if (questionComparisons < 15 && currentQuestion === q) {
              currentQuestion = q;
            } else if (questionComparisons >= 15 && currentQuestion === q) {
              currentQuestion = q + 1;
            }

            // 최근 활동 시간
            if (comparisons && comparisons.length > 0) {
              lastActivity = comparisons[0].created_at;
            }
          } else {
            questionProgress.push(0);
          }
        }

        return {
          student_id: studentId,
          student_name: studentName,
          student_code: studentCode,
          question_1_progress: questionProgress[0] || 0,
          question_2_progress: questionProgress[1] || 0,
          question_3_progress: questionProgress[2] || 0,
          question_4_progress: questionProgress[3] || 0,
          question_5_progress: questionProgress[4] || 0,
          total_comparisons: totalComparisons,
          current_question: Math.min(currentQuestion, maxQuestions),
          is_active: totalComparisons > 0 && currentQuestion <= maxQuestions,
          last_activity: lastActivity
        };
      }) || [];

      const results = await Promise.all(progressPromises);
      setProgressData(results);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallProgress = (student: StudentProgressData) => {
    const totalProgress = (
      student.question_1_progress +
      student.question_2_progress +
      student.question_3_progress +
      student.question_4_progress +
      student.question_5_progress
    ) / maxQuestions;
    return Math.round(totalProgress);
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return "default";
    if (progress >= 50) return "secondary";
    return "outline";
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return "미시작";
    
    const now = new Date();
    const activityTime = new Date(lastActivity);
    const diffMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 5) return "활동 중";
    if (diffMinutes < 30) return "최근 활동";
    return "비활성";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>학생 진행 상황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          학생별 비교 진행 상황
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {progressData.map((student) => {
            const overallProgress = getOverallProgress(student);
            const activityStatus = getActivityStatus(student.last_activity);
            
            return (
              <div key={student.student_id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{student.student_name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({student.student_code})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={student.is_active ? "default" : "outline"}>
                      {activityStatus}
                    </Badge>
                    <Badge variant="secondary">
                      {student.current_question}번 문항
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>전체 진행률</span>
                      <span>{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>{student.total_comparisons}/{maxQuestions * 15}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].slice(0, maxQuestions).map((questionNum) => {
                    const progressKey = `question_${questionNum}_progress` as keyof StudentProgressData;
                    const progress = student[progressKey] as number;
                    
                    return (
                      <div key={questionNum} className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          {questionNum}번
                        </div>
                        <Progress 
                          value={progress} 
                          className="h-1.5"
                        />
                        <div className="text-xs mt-1">
                          <Badge 
                            variant={getStatusColor(progress)}
                            className="text-xs px-1"
                          >
                            {Math.round(progress)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {student.last_activity && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>최근 활동: {new Date(student.last_activity).toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};