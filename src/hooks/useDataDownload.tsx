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

      // Fetch comparisons data
      const { data: comparisons, error: comparisonsError } = await supabase
        .from('comparisons')
        .select(`
          *,
          student_responses_a:response_a_id(*),
          student_responses_b:response_b_id(*)
        `)
        .eq('project_id', projectId);

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

      // Transform comparisons data
      const comparisonsData: ComparisonRow[] = comparisons?.map(comp => ({
        pairId: `${comp.response_a_id}-${comp.response_b_id}`,
        reviewerId: comp.student_id,
        decision: comp.decision === 'left' ? 'L' : comp.decision === 'right' ? 'R' : 'N',
        decisionTimeMs: comp.comparison_time_ms || 0,
        shownAt: comp.shown_at_server || comp.shown_at_client || comp.created_at,
        submittedAt: comp.submitted_at_server || comp.submitted_at_client || comp.created_at,
        uiOrderLeftId: comp.ui_order_left_id || comp.response_a_id,
        uiOrderRightId: comp.ui_order_right_id || comp.response_b_id,
        isMirrorReshow: comp.is_mirror || false,
        isDuplicateReeval: comp.is_duplicate_reeval || false,
        weightApplied: comp.weight_applied || 1.0,
        mirrorGroupId: comp.mirror_group_id,
        reevalGroupId: comp.reeval_group_id,
        agreementSnapshot: comp.agreement_snapshot,
        popupShown: comp.popup_shown || false,
        popupReason: comp.popup_reason,
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
        'pairId', 'reviewerId', 'decision', 'decisionTimeMs', 'shownAt', 'submittedAt',
        'uiOrderLeftId', 'uiOrderRightId', 'isMirrorReshow', 'isDuplicateReeval',
        'weightApplied', 'mirrorGroupId', 'reevalGroupId', 'agreementSnapshot',
        'popupShown', 'popupReason'
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
      const readmeContent = `# Comparative Judgment Data Export

## 파일 설명

### comparisons.csv
모든 비교 판단 기록
- pairId: 비교 쌍 식별자 (응답A-응답B)
- reviewerId: 평가자 식별자
- decision: 판단 결과 (L=왼쪽, R=오른쪽, N=중립)
- decisionTimeMs: 결정 시간 (밀리초)
- shownAt: 화면 표시 시각 (ISO 8601)
- submittedAt: 제출 시각 (ISO 8601)
- uiOrderLeftId: 화면 왼쪽에 표시된 응답 ID
- uiOrderRightId: 화면 오른쪽에 표시된 응답 ID
- isMirrorReshow: 미러 재제시 여부
- isDuplicateReeval: 중복 재평가 여부
- weightApplied: 적용된 가중치 (1.0=정상, 0.5=하향조정)

### reviewer_summary.csv
평가자별 요약 통계
- reviewerId: 평가자 식별자
- totalComparisons: 총 비교 횟수
- shortDecisionStreaks: 초단시간 응답 연속 발생 횟수
- leftChoiceStreakMax: 최대 연속 좌측 선택 횟수
- rightChoiceStreakMax: 최대 연속 우측 선택 횟수
- lowAgreementFlag: 낮은 일치율 플래그
- inconsistencyCount: 불일치 횟수
- inconsistencyRate: 불일치 비율
- finalWeightApplied: 최종 적용 가중치
- agreementRate: 합의와의 일치율

### sessions.csv
세션 메타데이터
- sessionId: 세션 식별자
- questionId: 문항 번호
- startedAt: 세션 시작 시각
- closedAt: 세션 종료 시각
- randomSeed: 난수 시드 (재현성)
- appVersion: 앱 버전
- targetPerResponse: 응답당 목표 비교 횟수
- pairingStrategy: 페어링 전략
- kElo: Elo 업데이트 계수
- allowTie: 무승부 허용 여부

## 시간 단위
- 모든 시간은 밀리초(ms) 단위
- 타임스탬프는 ISO 8601 형식 (Asia/Seoul 기준)

## 데이터 활용 시 주의사항
- 미러 재제시(isMirrorReshow=true) 데이터는 편향 진단용
- 가중치가 적용된 데이터는 품질 관리 후 결과
- 세션별 randomSeed를 통해 결과 재현 가능
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
      link.download = `project_${projectId}_data_${new Date().toISOString().split('T')[0]}.zip`;
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