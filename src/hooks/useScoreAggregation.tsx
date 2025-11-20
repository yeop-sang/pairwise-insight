import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface AggregateScoresRequest {
  project_id: string;
  question_numbers: number[];
  method: 'weighted_avg';
  weights?: Record<number, number>;
  run_id?: string;
  persist: boolean;
}

interface AggregatedScoreItem {
  response_id: string;
  student_code: string;
  q1_score?: number;
  q2_score?: number;
  q3_score?: number;
  q4_score?: number;
  q5_score?: number;
  total_score: number;
  rank: number;
}

interface AggregateScoresResponse {
  items: AggregatedScoreItem[];
  summary: {
    total_responses: number;
    method: string;
    weights: Record<number, number>;
  };
}

export const useScoreAggregation = () => {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<AggregatedScoreItem[]>([]);
  const { toast } = useToast();

  const aggregateScores = async (params: AggregateScoresRequest) => {
    setLoading(true);
    try {
      const result = await apiFetch<AggregateScoresResponse>(
        '/api/scores/aggregate',
        {
          method: 'POST',
          body: params
        }
      );

      setScores(result.items);
      
      toast({
        title: '점수 집계 완료',
        description: `${result.items.length}개 응답의 점수가 계산되었습니다.`
      });

      return result;
    } catch (error: any) {
      toast({
        title: '점수 집계 실패',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregatedScores = async (projectId: string, runId?: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ project_id: projectId });
      if (runId) query.append('run_id', runId);

      const result = await apiFetch<AggregatedScoreItem[]>(
        `/api/scores/aggregated?${query.toString()}`,
        { method: 'GET' }
      );

      setScores(result);
      return result;
    } catch (error: any) {
      toast({
        title: '점수 조회 실패',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    scores,
    aggregateScores,
    fetchAggregatedScores
  };
};
