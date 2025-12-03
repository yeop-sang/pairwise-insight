import { MIN_COMPARISONS_PER_PAIR, calculateTotalPairs } from './comparisonCalculations';

interface StudentResponse {
  id: string;
  student_code: string;
  response_text: string;
  question_number: number;
}

interface ComparisonPair {
  responseA: StudentResponse;
  responseB: StudentResponse;
  priority: number;
}

interface ReviewerState {
  id: string;
  quota: number; // 남은 할당량 (동적으로 설정)
  targetQuota: number; // 목표 할당량
  recentResponses: string[]; // 최근 본 응답 ID들
  totalComparisons: number;
}

interface ResponseState {
  id: string;
  need: number; // 필요한 비교 횟수
  tempScore: number; // 임시 점수 (엘로 형태)
  totalComparisons: number;
  wins: number;
  losses: number;
}

export class ComparisonAlgorithm {
  private responses: StudentResponse[] = [];
  private reviewers: Map<string, ReviewerState> = new Map();
  private responseStates: Map<string, ResponseState> = new Map();
  private reviewerCompletedPairs: Map<string, Set<string>> = new Map(); // Track completed pairs per reviewer
  private pairComparisonCounts: Map<string, number> = new Map(); // 쌍별 비교 횟수 추적
  private minComparisonsPerPair: number = MIN_COMPARISONS_PER_PAIR;
  private totalTargetComparisons: number;
  private currentPhase: 'random' | 'adaptive' = 'random';
  private phaseThreshold: number; // 50% 지점
  
  constructor(responses: StudentResponse[], reviewerIds: string[], reviewerTargetPerPerson: number = 25) {
    this.responses = responses;
    this.totalTargetComparisons = reviewerIds.length * reviewerTargetPerPerson;
    this.phaseThreshold = Math.floor(this.totalTargetComparisons * 0.5); // 50%에서 전환
    
    console.log(`Initializing ComparisonAlgorithm: ${reviewerIds.length} reviewers, target ${reviewerTargetPerPerson} per person, total target: ${this.totalTargetComparisons}`);
    
    // 리뷰어 상태 초기화
    reviewerIds.forEach(id => {
      this.reviewers.set(id, {
        id,
        quota: reviewerTargetPerPerson,
        targetQuota: reviewerTargetPerPerson,
        recentResponses: [],
        totalComparisons: 0
      });
    });
    
    // 모든 쌍에 대해 비교 횟수 0으로 초기화
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const pairKey = this.getPairKey(responses[i].id, responses[j].id);
        this.pairComparisonCounts.set(pairKey, 0);
      }
    }
    
    // 응답별 상태 초기화
    const averageComparisonsPerResponse = (this.totalTargetComparisons * 2) / responses.length;
    responses.forEach(response => {
      this.responseStates.set(response.id, {
        id: response.id,
        need: averageComparisonsPerResponse,
        tempScore: 0,
        totalComparisons: 0,
        wins: 0,
        losses: 0
      });
    });
    
    console.log(`Initialized ${this.pairComparisonCounts.size} pairs for tracking (target: ${this.minComparisonsPerPair} comparisons per pair)`);
  }

  async initializeWithExistingComparisons(projectId: string, supabase: any) {
    try {
      // 현재 문항의 응답 ID들 추출
      const currentResponseIds = this.responses.map(r => r.id);
      
      // 현재 문항의 응답들에 대한 비교 데이터만 로드 (students 테이블과 조인해서 student_number 가져오기)
      const { data: comparisons, error } = await supabase
        .from('comparisons')
        .select(`
          *,
          students!inner(student_number)
        `)
        .eq('project_id', projectId)
        .in('response_a_id', currentResponseIds)
        .in('response_b_id', currentResponseIds);

      if (error) throw error;

      console.log(`Loading ${comparisons?.length || 0} existing comparisons for question ${this.responses[0]?.question_number}`);

      // 채점자별 완료된 페어 추적
      comparisons?.forEach((comp: any) => {
        // 두 응답이 모두 현재 문항에 속하는지 확인
        const responseA = this.responseStates.get(comp.response_a_id);
        const responseB = this.responseStates.get(comp.response_b_id);
        
        if (responseA && responseB) {
          const pairKey = this.getPairKey(comp.response_a_id, comp.response_b_id);
          
          // 쌍별 비교 횟수 업데이트
          const currentPairCount = this.pairComparisonCounts.get(pairKey) || 0;
          this.pairComparisonCounts.set(pairKey, currentPairCount + 1);
          
          // student_number를 문자열로 변환해서 reviewerId로 사용
          const reviewerIdFromDb = comp.students?.student_number?.toString();
          
          if (!reviewerIdFromDb) {
            console.warn('No student_number found for comparison:', comp.id);
            return;
          }
          
          // 채점자별 완료 페어에 추가
          if (!this.reviewerCompletedPairs.has(reviewerIdFromDb)) {
            this.reviewerCompletedPairs.set(reviewerIdFromDb, new Set());
          }
          this.reviewerCompletedPairs.get(reviewerIdFromDb)!.add(pairKey);
          
          // 리뷰어 상태 업데이트 (현재 문항에 대해서만)
          const reviewer = this.reviewers.get(reviewerIdFromDb);
          if (reviewer) {
            reviewer.quota = Math.max(0, reviewer.quota - 1);
            reviewer.totalComparisons++;
            
            // 최근 응답 목록 업데이트
            reviewer.recentResponses.push(comp.response_a_id, comp.response_b_id);
            if (reviewer.recentResponses.length > 10) {
              reviewer.recentResponses = reviewer.recentResponses.slice(-10);
            }
            
            console.log(`Updated reviewer ${reviewerIdFromDb}: quota=${reviewer.quota}, totalComparisons=${reviewer.totalComparisons}`);
          } else {
            console.log(`Reviewer ${reviewerIdFromDb} not found in reviewers map. Available reviewers:`, Array.from(this.reviewers.keys()));
          }
          
          // 응답 상태 업데이트
          responseA.need = Math.max(0, responseA.need - 1);
          responseB.need = Math.max(0, responseB.need - 1);
          responseA.totalComparisons++;
          responseB.totalComparisons++;
          
          // 임시 점수 업데이트
          this.updateTempScores(comp.response_a_id, comp.response_b_id, comp.decision);
        }
      });
      
      // 쌍별 비교 횟수 통계 로깅
      const pairStats = this.getPairCompletionStats();
      console.log(`Pair completion stats: ${pairStats.completedPairs}/${pairStats.totalPairs} pairs completed (${pairStats.pairCoverage}%)`);
      
      // 현재 단계 결정 - 총 완료된 비교 횟수 계산
      let totalCompleted = 0;
      this.reviewerCompletedPairs.forEach(pairSet => {
        totalCompleted += pairSet.size;
      });
      this.currentPhase = totalCompleted < this.phaseThreshold ? 'random' : 'adaptive';
      
    } catch (error) {
      console.error('Error initializing comparison algorithm:', error);
    }
  }

  private getPairKey(responseAId: string, responseBId: string): string {
    return [responseAId, responseBId].sort().join('-');
  }

  private updateTempScores(responseAId: string, responseBId: string, decision: string) {
    const responseA = this.responseStates.get(responseAId);
    const responseB = this.responseStates.get(responseBId);
    
    if (!responseA || !responseB) return;
    
    const adjustmentFactor = 0.1; // 조정 폭
    
    switch (decision) {
      case 'left': // A 승리
        responseA.tempScore += adjustmentFactor;
        responseB.tempScore -= adjustmentFactor;
        responseA.wins++;
        responseB.losses++;
        break;
      case 'right': // B 승리
        responseB.tempScore += adjustmentFactor;
        responseA.tempScore -= adjustmentFactor;
        responseB.wins++;
        responseA.losses++;
        break;
      case 'neutral': // 중립
        const scoreDiff = responseA.tempScore - responseB.tempScore;
        const adjustment = scoreDiff * 0.05; // 작은 조정
        responseA.tempScore -= adjustment;
        responseB.tempScore += adjustment;
        break;
    }
  }

  getNextComparison(reviewerId: string): ComparisonPair | null {
    const reviewer = this.reviewers.get(reviewerId);
    if (!reviewer) {
      return null;
    }

    const candidates = this.generateCandidatePairs(reviewerId);
    
    // 완료 조건: quota를 다 채웠거나 더 이상 비교할 페어가 없을 때
    if (reviewer.quota <= 0 || candidates.length === 0) {
      return null;
    }

    if (this.currentPhase === 'random') {
      // 랜덤 단계: 완전 무작위 선택
      const selectedPair = candidates[Math.floor(Math.random() * candidates.length)];
      return selectedPair;
    } else {
      // 적응 단계: 우선순위에 따라 정렬하고 상위 후보에서 랜덤 선택
      candidates.sort((a, b) => b.priority - a.priority);
      const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
      const selectedPair = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      return selectedPair;
    }
  }

  private generateCandidatePairs(reviewerId: string): ComparisonPair[] {
    const reviewer = this.reviewers.get(reviewerId);
    if (!reviewer) return [];

    const candidates: ComparisonPair[] = [];
    const reviewerCompleted = this.reviewerCompletedPairs.get(reviewerId) || new Set();
    
    console.log(`Generating candidate pairs for reviewer: ${reviewerId}, already completed: ${reviewerCompleted.size} pairs`);
    
    for (let i = 0; i < this.responses.length; i++) {
      for (let j = i + 1; j < this.responses.length; j++) {
        const responseA = this.responses[i];
        const responseB = this.responses[j];
        const pairKey = this.getPairKey(responseA.id, responseB.id);
        
        // 현재 채점자가 이미 비교한 페어만 제외 (다른 채점자가 비교한 페어는 포함 가능)
        if (reviewerCompleted.has(pairKey)) {
          continue;
        }
        
        const priority = this.calculatePairPriority(responseA.id, responseB.id, reviewerId);
        candidates.push({
          responseA,
          responseB,
          priority
        });
      }
    }
    
    console.log(`Generated ${candidates.length} candidate pairs (all responses included, no self-exclusion)`);
    return candidates;
  }


  private calculatePairPriority(responseAId: string, responseBId: string, reviewerId: string): number {
    const responseA = this.responseStates.get(responseAId);
    const responseB = this.responseStates.get(responseBId);
    const reviewer = this.reviewers.get(reviewerId);
    
    if (!responseA || !responseB || !reviewer) return 0;

    const pairKey = this.getPairKey(responseAId, responseBId);
    const pairCount = this.pairComparisonCounts.get(pairKey) || 0;

    let priority = 0;

    // 1. 핵심: 비교가 덜 된 쌍에 높은 우선순위 (각 쌍 최소 3회 보장)
    const needsMoreComparisons = this.minComparisonsPerPair - pairCount;
    if (needsMoreComparisons > 0) {
      priority += needsMoreComparisons * 50; // 비교가 필요한 쌍에 강력한 우선순위
    }
    
    // 2. 비슷한 점수(등수)인 응답끼리 우선 (점수 차이가 작을수록 높은 우선순위)
    const scoreDiff = Math.abs(responseA.tempScore - responseB.tempScore);
    priority += Math.max(0, 100 - scoreDiff * 20);
    
    // 3. 비교가 더 필요한 응답 우선 (need가 높을수록 우선순위 높음)
    priority += (responseA.need + responseB.need) * 2;
    
    // 4. 비교 횟수가 적은 응답 우선 (더 확실한 순위 결정을 위해)
    const minComparisons = Math.min(responseA.totalComparisons, responseB.totalComparisons);
    if (minComparisons < 3) {
      priority += (3 - minComparisons) * 10;
    }

    return Math.max(0, priority);
  }

  processComparison(reviewerId: string, responseAId: string, responseBId: string, decision: string) {
    const reviewer = this.reviewers.get(reviewerId);
    const responseA = this.responseStates.get(responseAId);
    const responseB = this.responseStates.get(responseBId);
    
    if (!reviewer || !responseA || !responseB) return;

    const pairKey = this.getPairKey(responseAId, responseBId);
    
    // 쌍별 비교 횟수 업데이트
    const currentPairCount = this.pairComparisonCounts.get(pairKey) || 0;
    this.pairComparisonCounts.set(pairKey, currentPairCount + 1);
    
    // 채점자별 완료 페어에 추가
    if (!this.reviewerCompletedPairs.has(reviewerId)) {
      this.reviewerCompletedPairs.set(reviewerId, new Set());
    }
    this.reviewerCompletedPairs.get(reviewerId)!.add(pairKey);

    // 리뷰어 상태 업데이트
    reviewer.quota--;
    reviewer.totalComparisons++;
    reviewer.recentResponses.push(responseAId, responseBId);
    if (reviewer.recentResponses.length > 10) {
      reviewer.recentResponses = reviewer.recentResponses.slice(-10);
    }

    // 응답 상태 업데이트
    responseA.need = Math.max(0, responseA.need - 1);
    responseB.need = Math.max(0, responseB.need - 1);
    responseA.totalComparisons++;
    responseB.totalComparisons++;

    // 임시 점수 업데이트
    this.updateTempScores(responseAId, responseBId, decision);

    // 단계 전환 확인 - 총 완료된 비교 횟수 계산
    let totalCompleted = 0;
    this.reviewerCompletedPairs.forEach(pairSet => {
      totalCompleted += pairSet.size;
    });
    if (this.currentPhase === 'random' && totalCompleted >= this.phaseThreshold) {
      this.currentPhase = 'adaptive';
    }
    
    // 쌍 완료 로깅
    const newPairCount = this.pairComparisonCounts.get(pairKey) || 0;
    if (newPairCount === this.minComparisonsPerPair) {
      console.log(`Pair ${pairKey} reached target of ${this.minComparisonsPerPair} comparisons`);
    }
  }

  // 쌍별 완료 통계
  getPairCompletionStats() {
    let completedPairs = 0;
    let totalPairComparisons = 0;
    const totalPairs = this.pairComparisonCounts.size;
    
    this.pairComparisonCounts.forEach((count) => {
      totalPairComparisons += count;
      if (count >= this.minComparisonsPerPair) {
        completedPairs++;
      }
    });
    
    const avgComparisonsPerPair = totalPairs > 0 ? totalPairComparisons / totalPairs : 0;
    
    return {
      completedPairs,
      totalPairs,
      pairCoverage: totalPairs > 0 ? Math.round((completedPairs / totalPairs) * 100) : 0,
      avgComparisonsPerPair: Math.round(avgComparisonsPerPair * 10) / 10,
      minComparisonsPerPair: this.minComparisonsPerPair
    };
  }

  getCompletionStats() {
    const totalReviewers = this.reviewers.size;
    const completedReviewers = Array.from(this.reviewers.values()).filter(r => r.quota === 0).length;
    
    // 총 완료된 비교 횟수 (모든 채점자의 비교 합산)
    let totalComparisons = 0;
    this.reviewerCompletedPairs.forEach(pairSet => {
      totalComparisons += pairSet.size;
    });
    
    const averageComparisonsPerResponse = totalComparisons > 0 ? 
      (totalComparisons * 2) / this.responses.length : 0;

    // 쌍별 통계 포함
    const pairStats = this.getPairCompletionStats();

    return {
      totalComparisons,
      targetComparisons: this.totalTargetComparisons,
      progress: this.totalTargetComparisons > 0 ? 
        Math.round((totalComparisons / this.totalTargetComparisons) * 100) : 0,
      completedReviewers,
      totalReviewers,
      averageComparisonsPerResponse: Math.round(averageComparisonsPerResponse),
      currentPhase: this.currentPhase,
      isComplete: completedReviewers === totalReviewers,
      // 쌍별 통계 추가
      pairCoverage: pairStats.pairCoverage,
      completedPairs: pairStats.completedPairs,
      totalPairs: pairStats.totalPairs,
      avgComparisonsPerPair: pairStats.avgComparisonsPerPair
    };
  }

  canReviewerContinue(reviewerId: string): boolean {
    const reviewer = this.reviewers.get(reviewerId);
    if (!reviewer || reviewer.quota <= 0) return false;
    
    const nextComparison = this.getNextComparison(reviewerId);
    return nextComparison !== null;
  }

  getReviewerStats(reviewerId: string) {
    const reviewer = this.reviewers.get(reviewerId);
    if (!reviewer) return null;

    const completed = reviewer.targetQuota - reviewer.quota;
    return {
      completed,
      remaining: reviewer.quota,
      total: reviewer.targetQuota,
      progress: reviewer.targetQuota > 0 ? Math.round((completed / reviewer.targetQuota) * 100) : 0
    };
  }
}