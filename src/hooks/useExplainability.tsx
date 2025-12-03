import { useState, useCallback } from 'react';
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

interface QuestionKeywords {
  questionNumber: number;
  goodWords: WordScore[];
  badWords: WordScore[];
  loading: boolean;
}

export const useExplainability = () => {
  const [loading, setLoading] = useState(false);
  const [goodWords, setGoodWords] = useState<WordScore[]>([]);
  const [badWords, setBadWords] = useState<WordScore[]>([]);
  const [keywordsByQuestion, setKeywordsByQuestion] = useState<Record<number, QuestionKeywords>>({});
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

  // 문항별 키워드 추출
  const extractFeaturesByQuestion = useCallback(async (
    projectId: string,
    questionNumber: number,
    topK: number
  ) => {
    setKeywordsByQuestion(prev => ({
      ...prev,
      [questionNumber]: {
        ...prev[questionNumber],
        questionNumber,
        loading: true,
        goodWords: prev[questionNumber]?.goodWords || [],
        badWords: prev[questionNumber]?.badWords || [],
      }
    }));

    try {
      const result = await apiFetch<ExplainFeaturesResponse>(
        '/api/explain/features/aggregate',
        {
          method: 'POST',
          body: {
            project_id: projectId,
            question_numbers: [questionNumber],
            top_k: topK,
            persist: true
          }
        }
      );

      setKeywordsByQuestion(prev => ({
        ...prev,
        [questionNumber]: {
          questionNumber,
          goodWords: result.good_words,
          badWords: result.bad_words,
          loading: false,
        }
      }));

      return result;
    } catch (error: any) {
      setKeywordsByQuestion(prev => ({
        ...prev,
        [questionNumber]: {
          ...prev[questionNumber],
          loading: false,
        }
      }));
      throw error;
    }
  }, []);

  // 모든 문항의 키워드를 한번에 추출
  const extractAllQuestionFeatures = useCallback(async (
    projectId: string,
    maxQuestions: number,
    topK: number
  ) => {
    setLoading(true);
    
    try {
      const promises = Array.from({ length: maxQuestions }, (_, i) => i + 1).map(
        questionNumber => extractFeaturesByQuestion(projectId, questionNumber, topK)
      );
      
      await Promise.all(promises);
      
      toast({
        title: '키워드 추출 완료',
        description: `${maxQuestions}개 문항의 키워드가 추출되었습니다.`
      });
    } catch (error: any) {
      toast({
        title: '키워드 추출 실패',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [extractFeaturesByQuestion, toast]);

  return {
    loading,
    goodWords,
    badWords,
    keywordsByQuestion,
    extractFeatures,
    extractFeaturesByQuestion,
    extractAllQuestionFeatures,
  };
};
