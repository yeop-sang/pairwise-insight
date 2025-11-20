import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useBTStatus } from '@/hooks/useBTStatus';
import { format } from 'date-fns';

interface BTStatusPanelProps {
  projectId: string;
}

export const BTStatusPanel = ({ projectId }: BTStatusPanelProps) => {
  const { loading, latestRun, refetch } = useBTStatus(projectId);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">완료</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-600">진행 중</Badge>;
      default:
        return <Badge variant="outline">없음</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">BT 학습 상태</CardTitle>
        <Button onClick={refetch} variant="ghost" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {latestRun ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">상태</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(latestRun.status)}
                {getStatusBadge(latestRun.status)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Run ID</span>
              <span className="text-sm font-mono">{latestRun.run_id.slice(0, 8)}...</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">시작 시각</span>
              <span className="text-sm">
                {format(new Date(latestRun.started_at), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            </div>
            
            {latestRun.finished_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">종료 시각</span>
                <span className="text-sm">
                  {format(new Date(latestRun.finished_at), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
            )}
            
            {latestRun.num_comparisons && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">비교 횟수</span>
                <span className="text-sm font-medium">{latestRun.num_comparisons}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            BT 학습 기록이 없습니다.
          </p>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 BT 학습은 백엔드에서 자동으로 실행됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
