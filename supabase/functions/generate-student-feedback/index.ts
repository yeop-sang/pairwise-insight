import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  project_id: string;
  question_number: number;
  student_code: string;
  response_text: string;
  good_keywords: { word: string; score: number }[];
  custom_direction?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { project_id, question_number, student_code, response_text, good_keywords, custom_direction }: FeedbackRequest = await req.json();

    console.log(`Generating feedback for student ${student_code}, question ${question_number}`);
    console.log(`Good keywords count: ${good_keywords.length}`);
    console.log(`Custom direction: ${custom_direction || 'None'}`);

    // Format keywords for the prompt
    const keywordList = good_keywords.map((k, i) => `${i + 1}. ${k.word}`).join('\n');

    // Build the system prompt
    const systemPrompt = `당신은 학생의 성장을 진심으로 원하는 20년 이상 경력의 한국 교사입니다.
학생들이 스스로 생각하고 발전할 수 있도록 따뜻하면서도 구체적인 피드백을 제공합니다.
직접적인 정답을 알려주지 않고, 학생이 스스로 깨달을 수 있는 비계(힌트, 질문)를 제공하는 것이 당신의 교육 철학입니다.`;

    // Build the user prompt
    let userPrompt = `[좋은 답변에서 자주 발견되는 키워드 (상위 ${good_keywords.length}개)]
${keywordList}

[학생의 답변]
${response_text}

`;

    if (custom_direction) {
      userPrompt += `[교사의 피드백 방향성]
${custom_direction}

`;
    }

    userPrompt += `다음 사항을 포함하여 피드백을 작성해주세요:
1. 학생 답변에서 발견되는 좋은 점을 먼저 칭찬해주세요
2. 위 키워드 중 학생 답변에 포함되지 않은 중요한 개념들을 파악하세요
3. 누락된 개념들을 학생이 스스로 떠올릴 수 있도록 힌트나 질문 형태로 비계를 제공하세요
4. 직접적인 정답을 알려주지 마세요
5. 격려하고 따뜻한 톤으로 작성해주세요

피드백은 200자 내외로 간결하게 작성해주세요.`;

    console.log('Calling Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI 크레딧이 부족합니다.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const feedbackText = data.choices?.[0]?.message?.content || '';

    console.log('Feedback generated successfully');

    return new Response(JSON.stringify({
      success: true,
      feedback: feedbackText,
      student_code,
      question_number,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-student-feedback:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
