import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface AlignmentItem {
  student_id: string;
  student_code: string;
  name: string;
  alignment_score: number;
  matches: number;
  total_comparisons: number;
}

export interface AlignmentResponse {
  project_id: string;
  question_number: number | null;
  top_n: number;
  items: AlignmentItem[];
}

interface UseReviewerAlignmentOptions {
  projectId: string;
  questionNumber?: number;
  topN?: number;
}

export const useReviewerAlignment = () => {
  const [data, setData] = useState<AlignmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlignment = useCallback(async (options: UseReviewerAlignmentOptions) => {
    const { projectId, questionNumber, topN = 3 } = options;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        project_id: projectId,
        top_n: topN.toString(),
      });

      if (questionNumber !== undefined) {
        params.append('question_number', questionNumber.toString());
      }

      const response = await apiFetch<AlignmentResponse>(
        `/api/reviewers/alignment?${params.toString()}`
      );

      setData(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || '데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    fetchAlignment,
    reset,
  };
};
