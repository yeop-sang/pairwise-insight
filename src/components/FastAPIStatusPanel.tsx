import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useFastAPIHealth } from '@/hooks/useFastAPIHealth';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL;

export const FastAPIStatusPanel = () => {
  const { isHealthy, healthData, loading, error, refetch } = useFastAPIHealth();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">FastAPI 백엔드 상태</CardTitle>
            <CardDescription className="text-sm mt-1">
              {FASTAPI_BASE_URL || 'URL이 설정되지 않음'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 연결 상태 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">연결 상태</span>
            {loading ? (
              <Badge variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                확인 중...
              </Badge>
            ) : isHealthy === true ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                정상
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                연결 실패
              </Badge>
            )}
          </div>

          {/* 서버 정보 */}
          {healthData && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">서버 이름</span>
                <span className="font-medium">{healthData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">버전</span>
                <span className="font-medium">{healthData.version}</span>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <span className="font-medium">에러:</span> {error}
            </div>
          )}

          {/* API 엔드포인트 목록 */}
          {isHealthy && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">사용 가능한 API</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• POST /api/scores/aggregate - 점수 집계</li>
                <li>• GET /api/scores/aggregated - 집계된 점수 조회</li>
                <li>• POST /api/bt/train - BT 모델 학습</li>
                <li>• POST /api/explain/features/aggregate - 설명 기능 추출</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
