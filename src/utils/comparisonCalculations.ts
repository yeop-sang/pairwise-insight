/**
 * 브래들리-테리 알고리즘에 필요한 비교 횟수를 계산합니다.
 * 
 * @param numResponses 응답의 개수
 * @returns 권장 비교 횟수
 * 
 * 계산 로직:
 * - 각 응답이 최소 3-5번 비교되도록 보장
 * - 최소 비교 횟수: 10개
 * - 최대 비교 횟수: min(numResponses * 5, numResponses * (numResponses - 1) / 2)
 */
export const calculateRequiredComparisons = (numResponses: number): number => {
  if (numResponses <= 0) return 0;
  if (numResponses === 1) return 0; // 응답이 1개면 비교 불필요
  if (numResponses === 2) return 10; // 최소 10개
  
  // 브래들리-테리 알고리즘에 필요한 비교 횟수
  // 각 응답당 최소 5번의 비교 (신뢰도 확보)
  const minComparisonsPerResponse = 5;
  const baseComparisons = numResponses * minComparisonsPerResponse;
  
  // 모든 가능한 쌍의 개수 (상한선)
  const maxPossiblePairs = (numResponses * (numResponses - 1)) / 2;
  
  // 둘 중 작은 값 선택 (비효율 방지)
  const requiredComparisons = Math.min(baseComparisons, maxPossiblePairs);
  
  // 최소 10개 보장
  return Math.max(10, Math.floor(requiredComparisons));
};

/**
 * 응답 개수별 권장 비교 횟수 예시:
 * - 2개 응답: 10회
 * - 3개 응답: 15회
 * - 4개 응답: 20회
 * - 5개 응답: 25회
 * - 10개 응답: 45회 (10*5=50 vs 10*9/2=45, 작은 값 선택)
 * - 20개 응답: 100회 (20*5=100 vs 20*19/2=190, 작은 값 선택)
 */
