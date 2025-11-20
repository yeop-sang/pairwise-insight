import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface WordScore {
  word: string;
  score: number;
}

interface ExplainFeaturesRequest {
  project_id: string;
  question_numbers: number[];
  top_k: number;
  persist?: boolean;
}

interface ExplainFeaturesResponse {
  good_words: WordScore[];
  bad_words: WordScore[];
  metadata: {
    project_id: string;
    question_numbers: number[];
    top_k: number;
  };
}

export const useExplainability = () => {
  const [loading, setLoading] = useState(false);
  const [goodWords, setGoodWords] = useState<WordScore[]>([]);
  const [badWords, setBadWords] = useState<WordScore[]>([]);
  const { toast } = useToast();

  const extractFeatures = async (params: ExplainFeaturesRequest) => {
    setLoading(true);
    try {
      const result = await apiFetch<ExplainFeaturesResponse>(
        '/api/explain/features/aggregate',
        {
          method: 'POST',
          body: params
        }
      );

      setGoodWords(result.good_words);
      setBadWords(result.bad_words);

      toast({
        title: '단어 추출 완료',
        description: `Good Words: ${result.good_words.length}개, Bad Words: ${result.bad_words.length}개`
      });

      return result;
    } catch (error: any) {
      toast({
        title: '단어 추출 실패',
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
    goodWords,
    badWords,
    extractFeatures
  };
};
