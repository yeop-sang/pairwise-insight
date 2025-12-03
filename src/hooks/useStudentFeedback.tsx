import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WordScore {
  word: string;
  score: number;
}

interface StudentResponse {
  id: string;
  student_code: string;
  question_number: number;
  response_text: string;
}

interface StudentFeedback {
  id: string;
  project_id: string;
  response_id: string;
  student_code: string;
  question_number: number;
  original_response: string;
  feedback_text: string;
  custom_direction: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackWithResponse extends StudentResponse {
  feedback?: StudentFeedback;
  isGenerating?: boolean;
  editedFeedback?: string;
}

export const useStudentFeedback = (projectId: string) => {
  const [responses, setResponses] = useState<FeedbackWithResponse[]>([]);
  const [goodKeywords, setGoodKeywords] = useState<WordScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [customDirection, setCustomDirection] = useState('');
  const { toast } = useToast();

  const fetchResponses = useCallback(async (questionNumber: number) => {
    setLoading(true);
    try {
      // Fetch student responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('id, student_code, question_number, response_text')
        .eq('project_id', projectId)
        .eq('question_number', questionNumber)
        .order('student_code');

      if (responsesError) throw responsesError;

      // Fetch existing feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('student_feedback')
        .select('*')
        .eq('project_id', projectId)
        .eq('question_number', questionNumber);

      if (feedbackError) throw feedbackError;

      // Fetch good keywords for this specific question
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('explain_features')
        .select('good_words, question_number')
        .eq('project_id', projectId)
        .eq('question_number', questionNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (keywordsError) {
        console.error('Keywords fetch error:', keywordsError);
      }

      const keywords = (keywordsData?.good_words as unknown as WordScore[]) || [];
      setGoodKeywords(keywords.slice(0, 20));

      // Merge responses with feedback
      const mergedData: FeedbackWithResponse[] = (responsesData || []).map(response => {
        const feedback = (feedbackData || []).find(f => f.response_id === response.id);
        return {
          ...response,
          feedback: feedback as StudentFeedback | undefined,
          editedFeedback: feedback?.feedback_text || '',
        };
      });

      setResponses(mergedData);
    } catch (error: any) {
      console.error('Error fetching responses:', error);
      toast({
        title: '데이터 로딩 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const generateFeedback = useCallback(async (
    responseId: string,
    studentCode: string,
    responseText: string,
    questionNumber: number
  ) => {
    if (goodKeywords.length === 0) {
      toast({
        title: '키워드 없음',
        description: '먼저 키워드 탭에서 키워드를 추출해주세요.',
        variant: 'destructive',
      });
      return null;
    }

    setResponses(prev => prev.map(r => 
      r.id === responseId ? { ...r, isGenerating: true } : r
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-student-feedback', {
        body: {
          project_id: projectId,
          question_number: questionNumber,
          student_code: studentCode,
          response_text: responseText,
          good_keywords: goodKeywords,
          custom_direction: customDirection || undefined,
        },
      });

      if (error) throw error;

      const feedbackText = data.feedback;

      setResponses(prev => prev.map(r => 
        r.id === responseId 
          ? { ...r, isGenerating: false, editedFeedback: feedbackText } 
          : r
      ));

      toast({
        title: '피드백 생성 완료',
        description: `${studentCode} 학생의 피드백이 생성되었습니다.`,
      });

      return feedbackText;
    } catch (error: any) {
      console.error('Error generating feedback:', error);
      setResponses(prev => prev.map(r => 
        r.id === responseId ? { ...r, isGenerating: false } : r
      ));
      toast({
        title: '피드백 생성 실패',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [projectId, goodKeywords, customDirection, toast]);

  const generateAllFeedback = useCallback(async (questionNumber: number) => {
    const responsesWithoutFeedback = responses.filter(r => !r.editedFeedback);
    
    if (responsesWithoutFeedback.length === 0) {
      toast({
        title: '알림',
        description: '모든 학생에게 이미 피드백이 있습니다.',
      });
      return;
    }

    toast({
      title: '전체 피드백 생성 시작',
      description: `${responsesWithoutFeedback.length}명의 피드백을 생성합니다.`,
    });

    for (const response of responsesWithoutFeedback) {
      await generateFeedback(
        response.id,
        response.student_code,
        response.response_text,
        questionNumber
      );
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast({
      title: '전체 피드백 생성 완료',
      description: `${responsesWithoutFeedback.length}명의 피드백이 생성되었습니다.`,
    });
  }, [responses, generateFeedback, toast]);

  const saveFeedback = useCallback(async (
    responseId: string,
    studentCode: string,
    questionNumber: number,
    originalResponse: string,
    feedbackText: string
  ) => {
    try {
      // Check if feedback already exists
      const { data: existing } = await supabase
        .from('student_feedback')
        .select('id')
        .eq('response_id', responseId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('student_feedback')
          .update({
            feedback_text: feedbackText,
            custom_direction: customDirection || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('student_feedback')
          .insert({
            project_id: projectId,
            response_id: responseId,
            student_code: studentCode,
            question_number: questionNumber,
            original_response: originalResponse,
            feedback_text: feedbackText,
            custom_direction: customDirection || null,
          });

        if (error) throw error;
      }

      // Update local state
      setResponses(prev => prev.map(r => 
        r.id === responseId 
          ? { 
              ...r, 
              feedback: {
                id: existing?.id || '',
                project_id: projectId,
                response_id: responseId,
                student_code: studentCode,
                question_number: questionNumber,
                original_response: originalResponse,
                feedback_text: feedbackText,
                custom_direction: customDirection || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              editedFeedback: feedbackText,
            } 
          : r
      ));

      toast({
        title: '저장 완료',
        description: `${studentCode} 학생의 피드백이 저장되었습니다.`,
      });
    } catch (error: any) {
      console.error('Error saving feedback:', error);
      toast({
        title: '저장 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [projectId, customDirection, toast]);

  const updateEditedFeedback = useCallback((responseId: string, newText: string) => {
    setResponses(prev => prev.map(r => 
      r.id === responseId ? { ...r, editedFeedback: newText } : r
    ));
  }, []);

  return {
    responses,
    goodKeywords,
    loading,
    customDirection,
    setCustomDirection,
    fetchResponses,
    generateFeedback,
    generateAllFeedback,
    saveFeedback,
    updateEditedFeedback,
  };
};
