import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComparisonRow {
  pairId: string;
  reviewerId: string;
  decision: string;
  decisionTimeMs: number;
  shownAt: string;
  submittedAt: string;
  uiOrderLeftId: string;
  uiOrderRightId: string;
  isMirrorReshow: boolean;
  isDuplicateReeval: boolean;
  weightApplied: number;
  mirrorGroupId?: string;
  reevalGroupId?: string;
  agreementSnapshot?: number;
  popupShown: boolean;
  popupReason?: string;
}

interface ReviewerSummaryRow {
  reviewerId: string;
  totalComparisons: number;
  shortDecisionStreaks: number;
  leftChoiceStreakMax: number;
  rightChoiceStreakMax: number;
  lowAgreementFlag: boolean;
  inconsistencyCount: number;
  inconsistencyRate: number;
  finalWeightApplied: number;
  agreementRate: number;
}

interface SessionRow {
  sessionId: string;
  questionId: number;
  startedAt: string;
  closedAt?: string;
  randomSeed: string;
  appVersion: string;
  targetPerResponse: number;
  pairingStrategy: string;
  kElo: number;
  allowTie: boolean;
}

export const useDataDownload = () => {
  const { toast } = useToast();

  const generateCSV = useCallback((data: any[], headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }, []);

  const downloadProjectData = useCallback(async (projectId: string) => {
    try {
      toast({
        title: "데이터 준비 중...",
        description: "프로젝트 데이터를 수집하고 있습니다.",
      });

      // Fetch project info
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();

      // Fetch comparisons data with student info
      const { data: comparisons, error: comparisonsError } = await supabase
        .from('comparisons')
        .select(`
          *,
          students!comparisons_student_id_fkey(student_number, name, student_id),
          response_a:student_responses!comparisons_response_a_id_fkey(id, student_code, response_text),
          response_b:student_responses!comparisons_response_b_id_fkey(id, student_code, response_text)
        `)
        .eq('project_id', projectId)
        .order('question_number', { ascending: true })
        .order('created_at', { ascending: true });

      if (comparisonsError) throw comparisonsError;

      // Fetch reviewer stats
      const { data: reviewerStats, error: reviewerStatsError } = await supabase
        .from('reviewer_stats')
        .select('*')
        .eq('project_id', projectId);

      if (reviewerStatsError) throw reviewerStatsError;

      // Fetch session metadata
      const { data: sessions, error: sessionsError } = await supabase
        .from('session_metadata')
        .select('*')
        .eq('project_id', projectId);

      if (sessionsError) throw sessionsError;

      // Transform comparisons data with detailed info
      const comparisonsData = comparisons?.map((comp: any) => ({
        questionNumber: comp.question_number,
        reviewerStudentId: comp.students?.student_id || comp.student_id,
        reviewerName: comp.students?.name || '',
        responseACode: comp.response_a?.student_code || '',
        responseBCode: comp.response_b?.student_code || '',
        responseAId: comp.response_a_id,
        responseBId: comp.response_b_id,
        decision: comp.decision === 'left' ? 'A선택' : comp.decision === 'right' ? 'B선택' : '동점',
        decisionTimeMs: comp.comparison_time_ms || 0,
        uiOrderLeft: comp.ui_order_left_id === comp.response_a_id ? 'A' : 'B',
        uiOrderRight: comp.ui_order_right_id === comp.response_b_id ? 'B' : 'A',
        isMirrorReshow: comp.is_mirror ? '예' : '아니오',
        isDuplicateReeval: comp.is_duplicate_reeval ? '예' : '아니오',
        weightApplied: comp.weight_applied || 1.0,
        popupShown: comp.popup_shown ? '예' : '아니오',
        popupReason: comp.popup_reason || '',
        submittedAt: new Date(comp.submitted_at_server || comp.created_at).toLocaleString('ko-KR'),
      })) || [];

      // Transform reviewer stats data
      const reviewerSummaryData: ReviewerSummaryRow[] = reviewerStats?.map(stats => ({
        reviewerId: stats.student_id,
        totalComparisons: stats.total_comparisons,
        shortDecisionStreaks: stats.short_decision_streaks,
        leftChoiceStreakMax: stats.max_consecutive_left,
        rightChoiceStreakMax: stats.max_consecutive_right,
        lowAgreementFlag: stats.low_agreement_flag,
        inconsistencyCount: stats.inconsistency_count,
        inconsistencyRate: stats.inconsistency_rate,
        finalWeightApplied: stats.final_weight_applied,
        agreementRate: stats.agreement_score,
      })) || [];

      // Transform session data
      const sessionData: SessionRow[] = sessions?.map(session => ({
        sessionId: session.session_id,
        questionId: session.question_number,
        startedAt: session.started_at,
        closedAt: session.closed_at,
        randomSeed: session.random_seed,
        appVersion: session.app_version,
        targetPerResponse: session.target_per_response,
        pairingStrategy: session.pairing_strategy,
        kElo: session.k_elo,
        allowTie: session.allow_tie,
      })) || [];

      // Generate CSV files
      const comparisonsCSV = generateCSV(comparisonsData, [
        'questionNumber', 'reviewerStudentId', 'reviewerName', 'responseACode', 'responseBCode',
        'responseAId', 'responseBId', 'decision', 'decisionTimeMs', 'uiOrderLeft', 'uiOrderRight',
        'isMirrorReshow', 'isDuplicateReeval', 'weightApplied', 'popupShown', 'popupReason', 'submittedAt'
      ]);

      const reviewerSummaryCSV = generateCSV(reviewerSummaryData, [
        'reviewerId', 'totalComparisons', 'shortDecisionStreaks', 'leftChoiceStreakMax',
        'rightChoiceStreakMax', 'lowAgreementFlag', 'inconsistencyCount', 'inconsistencyRate',
        'finalWeightApplied', 'agreementRate'
      ]);

      const sessionsCSV = generateCSV(sessionData, [
        'sessionId', 'questionId', 'startedAt', 'closedAt', 'randomSeed', 'appVersion',
        'targetPerResponse', 'pairingStrategy', 'kElo', 'allowTie'
      ]);

      // Create README content
      const readmeContent = `# ${project?.title || '프로젝트'} - 비교 평가 데이터

## 📊 데이터 구조 (다중 평가 시스템)

이 프로젝트는 **동일한 응답 쌍을 여러 학생이 평가**하는 시스템입니다.
- 각 학생은 모든 응답(자신의 응답 포함)을 비교 대상으로 평가합니다
- 같은 페어(A-B)를 여러 학생이 평가하여 객관성을 확보합니다
- Bradley-Terry 모델을 통해 최종 순위를 산출합니다

## 📁 파일 설명

### comparisons.csv
**모든 비교 판단 기록** (각 행 = 1명의 학생이 1개 페어를 평가한 기록)
- questionNumber: 문항 번호
- reviewerStudentId: 평가자 학번
- reviewerName: 평가자 이름
- responseACode: 응답 A의 학생 코드
- responseBCode: 응답 B의 학생 코드
- responseAId/responseBId: 응답 UUID (내부 식별용)
- decision: 판단 결과 (A선택/B선택/동점)
- decisionTimeMs: 판단에 소요된 시간 (밀리초)
- uiOrderLeft/uiOrderRight: 화면 좌/우측에 표시된 응답 (A 또는 B)
- isMirrorReshow: 미러 비교 여부 (편향 감지용)
- isDuplicateReeval: 재평가 여부 (일관성 검증용)
- weightApplied: 적용된 가중치 (1.0=정상, 0.5=품질 저하)
- popupShown: 경고 팝업 표시 여부
- popupReason: 팝업 표시 사유
- submittedAt: 제출 시각

### reviewer_summary.csv
**평가자별 통계 요약**
- reviewerId: 평가자 학번
- totalComparisons: 해당 평가자가 수행한 총 비교 횟수
- shortDecisionStreaks: 매우 빠른 응답 연속 발생 횟수
- leftChoiceStreakMax: 최대 연속 좌측 선택 횟수
- rightChoiceStreakMax: 최대 연속 우측 선택 횟수
- lowAgreementFlag: 다른 평가자와의 낮은 일치율 플래그
- inconsistencyCount: 불일치 발생 횟수 (미러/재평가)
- inconsistencyRate: 불일치 비율
- finalWeightApplied: 최종 적용 가중치
- agreementRate: 다른 평가자들과의 합의 일치율

### sessions.csv
**세션 메타데이터** (문항별 세션 정보)
- sessionId: 세션 고유 ID
- questionId: 문항 번호
- startedAt: 세션 시작 시각
- closedAt: 세션 종료 시각
- randomSeed: 난수 시드 (페어 순서 재현용)
- appVersion: 앱 버전
- targetPerResponse: 응답당 목표 비교 횟수
- pairingStrategy: 페어링 전략 (balanced_adaptive 등)
- kElo: Elo 업데이트 계수
- allowTie: 동점 허용 여부

## 📈 데이터 분석 예시

### 1. 특정 페어에 대한 다중 평가 확인
동일한 responseACode + responseBCode 조합을 필터링하면,
여러 학생이 해당 페어를 어떻게 평가했는지 확인할 수 있습니다.

예: 학생1234와 학생5678의 응답을 비교한 모든 기록
- 3명이 A선택, 2명이 B선택 → A가 우세

### 2. 평가자 품질 분석
reviewer_summary.csv에서:
- inconsistencyRate가 높은 평가자 → 일관성 부족
- lowAgreementFlag=true인 평가자 → 다른 사람들과 판단 기준이 다름
- finalWeightApplied < 1.0인 평가자 → 시스템에서 가중치 하향 조정됨

### 3. Bradley-Terry 순위 산출
comparisons.csv의 decision 데이터를 기반으로
Bradley-Terry 모델을 적용하면 최종 응답 순위를 계산할 수 있습니다.

## ⚠️ 주의사항

- **같은 페어의 중복 기록**: 정상입니다! 여러 학생이 평가한 것입니다.
- **자신의 응답 평가**: 학생이 자신의 응답을 평가한 기록도 포함됩니다.
- **미러/재평가 데이터**: 품질 관리용이므로 최종 분석 시 별도 처리 고려
- **가중치가 적용된 데이터**: 시스템이 품질 저하를 감지하여 가중치를 조정한 기록

## 📞 문의사항
데이터 구조나 분석 방법에 대한 질문은 시스템 관리자에게 문의하세요.
`;

      // Create ZIP file using JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      zip.file('comparisons.csv', comparisonsCSV);
      zip.file('reviewer_summary.csv', reviewerSummaryCSV);
      zip.file('sessions.csv', sessionsCSV);
      zip.file('readme.txt', readmeContent);

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedTitle = (project?.title || 'project').replace(/[^a-zA-Z0-9가-힣]/g, '_');
      link.download = `${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `프로젝트 데이터가 ZIP 파일로 다운로드되었습니다.`,
      });

    } catch (error) {
      console.error('Error downloading project data:', error);
      toast({
        title: "다운로드 실패",
        description: "데이터 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [generateCSV, toast]);

  return {
    downloadProjectData,
  };
};