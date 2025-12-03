/**
 * 비교 평가에 필요한 비교 횟수를 계산합니다.
 * 
 * @param numResponses 응답의 개수
 * @returns 권장 비교 횟수
 * 
 * 계산 로직:
 * - 각 응답이 최소 3번 비교되도록 보장
 * - 최대 비교 횟수: 25회 (초과 시 강제 고정)
 */
export const calculateRequiredComparisons = (numResponses: number): number => {
  if (numResponses <= 0) return 0;
  if (numResponses === 1) return 0; // 응답이 1개면 비교 불필요
  
  // 각 응답당 최소 3번 비교
  const minComparisonsPerResponse = 3;
  const requiredComparisons = Math.ceil((numResponses * minComparisonsPerResponse) / 2);
  
  // 최대 25회로 제한
  return Math.min(requiredComparisons, 25);
};

/**
 * 응답 개수별 비교 횟수 예시:
 * - 2개 응답: 3회
 * - 5개 응답: 8회
 * - 10개 응답: 15회
 * - 15개 응답: 23회
 * - 17개 이상 응답: 25회 (최대값)
 */
