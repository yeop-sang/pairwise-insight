import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface StudentProgressData {
  studentId: string;
  studentName: string;
  progressByQuestion: { [key: number]: number };
  totalComparisons: number;
  currentQuestion: number | null;
  activityStatus: string;
  lastActivity: string | null;
}

interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  studentId: string;
  studentName: string;
  maxQuestions: number;
}

export const StudentProgressModal: React.FC<StudentProgressModalProps> = ({
  isOpen,
  onClose,
  projectId,
  studentId,
  studentName,
  maxQuestions
}) => {
  const [progressData, setProgressData] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStudentProgress = async () => {
    if (!projectId || !studentId) return;
    
    setLoading(true);
    try {
      const progress: StudentProgressData = {
        studentId,
        studentName,
        progressByQuestion: {},
        totalComparisons: 0,
        currentQuestion: null,
        activityStatus: '미시작',
        lastActivity: null
      };

      let totalComparisons = 0;
      let currentActiveQuestion = null;
      let lastActivityTime = null;

      // Fetch progress for each question
      for (let questionNum = 1; questionNum <= maxQuestions; questionNum++) {
        // Get responses for this question
        const { data: questionResponses } = await supabase
          .from('student_responses')
          .select('id')
          .eq('project_id', projectId)
          .eq('question_number', questionNum);

        if (!questionResponses || questionResponses.length === 0) continue;

        const responseIds = questionResponses.map(r => r.id);

        // Get comparisons for this student and question
        const { data: comparisons } = await supabase
          .from('comparisons')
          .select('created_at')
          .eq('project_id', projectId)
          .eq('student_id', studentId)
          .in('response_a_id', responseIds);

        const questionComparisons = comparisons?.length || 0;
        progress.progressByQuestion[questionNum] = Math.min((questionComparisons / 15) * 100, 100);
        totalComparisons += questionComparisons;

        // Determine current active question (first incomplete question)
        if (currentActiveQuestion === null && questionComparisons < 15) {
          currentActiveQuestion = questionNum;
        }

        // Find latest activity
        if (comparisons && comparisons.length > 0) {
          const latestComparison = comparisons.reduce((latest, current) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );
          if (!lastActivityTime || new Date(latestComparison.created_at) > new Date(lastActivityTime)) {
            lastActivityTime = latestComparison.created_at;
          }
        }
      }

      progress.totalComparisons = totalComparisons;
      progress.currentQuestion = currentActiveQuestion;
      progress.lastActivity = lastActivityTime;

      // Determine activity status
      if (totalComparisons === 0) {
        progress.activityStatus = '미시작';
      } else if (totalComparisons >= maxQuestions * 15) {
        progress.activityStatus = '완료';
      } else if (lastActivityTime) {
        const timeDiff = Date.now() - new Date(lastActivityTime).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 1) {
          progress.activityStatus = '활동 중';
        } else if (hoursDiff < 24) {
          progress.activityStatus = '최근 활동';
        } else {
          progress.activityStatus = '비활성';
        }
      }

      setProgressData(progress);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudentProgress();
    }
  }, [isOpen, projectId, studentId]);

  const getOverallProgress = () => {
    if (!progressData) return 0;
    const totalPossible = maxQuestions * 15;
    return Math.min((progressData.totalComparisons / totalPossible) * 100, 100);
  };

  const getStatusColor = (progress: number): "default" | "secondary" | "outline" => {
    if (progress >= 100) return "default";
    if (progress > 0) return "secondary";
    return "outline";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{studentName} 학생의 비교 진행상황</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : progressData ? (
          <div className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">전체 진행상황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 진행도</span>
                  <Badge variant={getStatusColor(getOverallProgress())}>
                    {progressData.activityStatus}
                  </Badge>
                </div>
                <Progress value={getOverallProgress()} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>완료한 비교: {progressData.totalComparisons}개</span>
                  <span>전체 목표: {maxQuestions * 15}개</span>
                </div>
                {progressData.currentQuestion && (
                  <div className="text-sm">
                    <Badge variant="outline">
                      현재 진행 중: {progressData.currentQuestion}번 문항
                    </Badge>
                  </div>
                )}
                {progressData.lastActivity && (
                  <div className="text-xs text-muted-foreground">
                    마지막 활동: {new Date(progressData.lastActivity).toLocaleString('ko-KR')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question-by-Question Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">문항별 진행상황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: maxQuestions }, (_, i) => i + 1).map(questionNum => {
                  const progress = progressData.progressByQuestion[questionNum] || 0;
                  const isCompleted = progress >= 100;
                  const isCurrent = progressData.currentQuestion === questionNum;
                  
                  return (
                    <div key={questionNum} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">문항 {questionNum}</span>
                        <div className="flex gap-2">
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              진행 중
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="default" className="text-xs">
                              완료
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {Math.round(progress)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={progress} 
                        className={`h-2 ${isCurrent ? 'ring-2 ring-primary ring-opacity-50' : ''}`} 
                      />
                      <div className="text-xs text-muted-foreground">
                        {Math.round((progress / 100) * 15)}/15 비교 완료
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            진행상황을 불러올 수 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};