/**
 * 비교 평가에 필요한 비교 횟수를 계산합니다.
 * 
 * 핵심 원칙: 각 응답 쌍(pair)이 최소 MIN_COMPARISONS_PER_PAIR명의 서로 다른 평가자에 의해 비교되어야 함
 * 이는 단일 평가자의 편향을 방지하고 신뢰도 높은 순위를 도출하기 위함입니다.
 */

// 상수 정의
export const MIN_COMPARISONS_PER_PAIR = 3; // 각 쌍이 최소 3명에 의해 비교
export const MAX_COMPARISONS_PER_STUDENT = 15; // 학생당 최대 15회
export const MIN_COMPARISONS_PER_STUDENT = 5; // 학생당 최소 5회

/**
 * 가능한 응답 쌍의 총 개수를 계산합니다.
 * C(n,2) = n(n-1)/2
 * 
 * @param numResponses 응답의 개수
 * @returns 가능한 쌍의 개수
 */
export const calculateTotalPairs = (numResponses: number): number => {
  if (numResponses <= 1) return 0;
  return (numResponses * (numResponses - 1)) / 2;
};

/**
 * 모든 쌍이 최소 횟수만큼 비교되기 위해 필요한 총 비교 횟수를 계산합니다.
 * 
 * @param numResponses 응답의 개수
 * @param minPerPair 각 쌍당 최소 비교 횟수 (기본값: 3)
 * @returns 필요한 총 비교 횟수
 */
export const calculateTotalComparisonsForPairs = (
  numResponses: number,
  minPerPair: number = MIN_COMPARISONS_PER_PAIR
): number => {
  const totalPairs = calculateTotalPairs(numResponses);
  return totalPairs * minPerPair;
};

/**
 * 학생당 필요한 비교 횟수를 동적으로 계산합니다.
 * 
 * @param numResponses 문항별 응답 개수
 * @param numReviewers 평가에 참여하는 학생 수
 * @param minPerPair 각 쌍당 최소 비교 횟수 (기본값: 3)
 * @returns 학생당 비교 횟수 (최소 5회, 최대 30회)
 * 
 * 계산 로직:
 * 1. 가능한 쌍의 수 계산: C(n,2)
 * 2. 필요한 총 비교 횟수: 쌍의 수 × 최소 비교 횟수
 * 3. 학생당 비교 횟수: 총 비교 횟수 / 참여 학생 수
 * 4. 최소 5회, 최대 30회로 제한
 */
export const calculateComparisonsPerStudent = (
  numResponses: number, 
  numReviewers: number,
  minPerPair: number = MIN_COMPARISONS_PER_PAIR
): number => {
  if (numResponses <= 1 || numReviewers <= 0) return 0;
  
  const totalRequired = calculateTotalComparisonsForPairs(numResponses, minPerPair);
  const perStudent = Math.ceil(totalRequired / numReviewers);
  
  // 학생당 최소 MIN, 최대 MAX로 제한
  return Math.max(MIN_COMPARISONS_PER_STUDENT, Math.min(perStudent, MAX_COMPARISONS_PER_STUDENT));
};

/**
 * 기존 함수 - 하위 호환성 유지
 * 
 * @param numResponses 응답의 개수
 * @returns 권장 비교 횟수
 * @deprecated calculateComparisonsPerStudent를 대신 사용하세요
 */
export const calculateRequiredComparisons = (numResponses: number): number => {
  if (numResponses <= 0) return 0;
  if (numResponses === 1) return 0;
  
  // 각 응답당 최소 3번 비교 (기존 로직)
  const minComparisonsPerResponse = 3;
  const requiredComparisons = Math.ceil((numResponses * minComparisonsPerResponse) / 2);
  
  // 최대 15회로 제한
  return Math.min(requiredComparisons, 15);
};

/**
 * 비교 진행률 관련 정보를 계산합니다.
 * 
 * @param numResponses 응답 개수
 * @param numReviewers 평가자 수
 * @param completedComparisons 완료된 비교 횟수
 */
export const getComparisonProgressInfo = (
  numResponses: number,
  numReviewers: number,
  completedComparisons: number = 0
) => {
  const totalPairs = calculateTotalPairs(numResponses);
  const totalRequired = calculateTotalComparisonsForPairs(numResponses);
  const perStudent = calculateComparisonsPerStudent(numResponses, numReviewers);
  const totalCapacity = numReviewers * perStudent;
  
  return {
    totalPairs,
    totalRequired,
    perStudent,
    totalCapacity,
    completedComparisons,
    progress: totalRequired > 0 ? Math.round((completedComparisons / totalRequired) * 100) : 0,
    isCapped: perStudent === MAX_COMPARISONS_PER_STUDENT,
    coverageWarning: totalCapacity < totalRequired 
      ? `참여자 ${numReviewers}명으로는 모든 쌍을 ${MIN_COMPARISONS_PER_PAIR}회씩 비교하기 어렵습니다. (가능: ${totalCapacity}회, 필요: ${totalRequired}회)`
      : null
  };
};

/**
 * 응답 개수별 비교 횟수 예시 (학생 5명 기준):
 * 
 * | 응답 수 | 쌍의 수 | 필요 비교(×3) | 학생당 |
 * |---------|---------|---------------|--------|
 * | 5개     | 10쌍    | 30회          | 6회    |
 * | 10개    | 45쌍    | 135회         | 27회   |
 * | 15개    | 105쌍   | 315회         | 30회(상한) |
 * | 20개    | 190쌍   | 570회         | 30회(상한) |
 */
