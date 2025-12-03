import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  calculateComparisonsPerStudent, 
  MAX_COMPARISONS_PER_STUDENT,
  MIN_COMPARISONS_PER_STUDENT 
} from '@/utils/comparisonCalculations';

interface SessionConfig {
  targetPerResponse: number;
  reviewerTargetPerPerson: number;
  pairingStrategy: string;
  kElo: number;
  allowTie: boolean;
  shortResponseThresholdMs: number;
  consecutiveBiasThreshold: number;
  mirrorReshowGap: number;
  duplicateReevalGap: number;
  agreementUpdateInterval: number;
  globalScoreRefreshInterval: number;
}

interface SessionMetadata {
  sessionId: string;
  projectId: string;
  questionNumber: number;
  randomSeed: string;
  appVersion: string;
  startedAt: Date;
  config: SessionConfig;
}

const DEFAULT_CONFIG: SessionConfig = {
  targetPerResponse: 15,
  reviewerTargetPerPerson: 15, // 기본값, 동적으로 계산됨
  pairingStrategy: 'balanced_adaptive',
  kElo: 32.0,
  allowTie: true,
  shortResponseThresholdMs: 3000,
  consecutiveBiasThreshold: 5,
  mirrorReshowGap: 4,
  duplicateReevalGap: 10,
  agreementUpdateInterval: 10,
  globalScoreRefreshInterval: 50,
};

export const useSessionMetadata = (
  projectId: string, 
  questionNumber: number, 
  numResponses?: number
) => {
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track if we've already updated for the current numResponses
  const lastUpdatedNumResponses = useRef<number | undefined>(undefined);

  const generateSessionId = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  const generateRandomSeed = useCallback(() => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }, []);

  const getAppVersion = useCallback(() => {
    return process.env.NODE_ENV === 'development' ? 'dev-1.0.0' : '1.0.0';
  }, []);

  // Calculate reviewer target based on responses and assigned students
  const calculateReviewerTarget = useCallback(async (responseCount: number): Promise<number> => {
    // 할당된 학생 수 조회
    const { data: assignedStudents, error: assignmentError } = await supabase
      .from('project_assignments')
      .select('student_id')
      .eq('project_id', projectId);
    
    if (assignmentError) {
      console.error('Error fetching assigned students:', assignmentError);
    }
    
    // 할당 학생이 없으면 응답자 수로 대체 (자기 평가 시나리오)
    const numReviewers = assignedStudents?.length || responseCount || 1;
    
    const target = calculateComparisonsPerStudent(responseCount, numReviewers);
    
    console.log(`Calculating reviewer target:`);
    console.log(`  - Responses: ${responseCount}`);
    console.log(`  - Reviewers: ${numReviewers}`);
    console.log(`  - Target: ${target} (min: ${MIN_COMPARISONS_PER_STUDENT}, max: ${MAX_COMPARISONS_PER_STUDENT})`);
    
    return target;
  }, [projectId]);

  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 응답 수가 유효하지 않으면 세션 생성 보류
      if (!numResponses || numResponses <= 0) {
        console.log(`Waiting for valid numResponses (current: ${numResponses})...`);
        setIsLoading(false);
        return;
      }
      
      // Check if session already exists for this project/question
      const { data: existingSession, error: selectError } = await supabase
        .from('session_metadata')
        .select('*')
        .eq('project_id', projectId)
        .eq('question_number', questionNumber)
        .is('closed_at', null)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing session:', selectError);
        throw new Error('세션 확인 중 오류가 발생했습니다.');
      }

      if (existingSession) {
        // Use existing session
        console.log(`Using existing session for question ${questionNumber}, target: ${existingSession.reviewer_target_per_person}`);
        setSessionMetadata({
          sessionId: existingSession.session_id,
          projectId: existingSession.project_id,
          questionNumber: existingSession.question_number,
          randomSeed: existingSession.random_seed,
          appVersion: existingSession.app_version,
          startedAt: new Date(existingSession.started_at),
          config: {
            targetPerResponse: existingSession.target_per_response,
            reviewerTargetPerPerson: existingSession.reviewer_target_per_person,
            pairingStrategy: existingSession.pairing_strategy,
            kElo: existingSession.k_elo,
            allowTie: existingSession.allow_tie,
            shortResponseThresholdMs: existingSession.short_response_threshold_ms,
            consecutiveBiasThreshold: existingSession.consecutive_bias_threshold,
            mirrorReshowGap: existingSession.mirror_reshow_gap,
            duplicateReevalGap: existingSession.duplicate_reeval_gap,
            agreementUpdateInterval: existingSession.agreement_update_interval,
            globalScoreRefreshInterval: existingSession.global_score_refresh_interval,
          }
        });
      } else {
        // Create new session with accurate numResponses
        const newSessionId = generateSessionId();
        const randomSeed = generateRandomSeed();
        const appVersion = getAppVersion();
        
        const requiredComparisonsPerStudent = await calculateReviewerTarget(numResponses);
        
        console.log(`Creating new session for question ${questionNumber}:`);
        console.log(`  - Responses: ${numResponses}`);
        console.log(`  - Comparisons per student: ${requiredComparisonsPerStudent}`);
        
        const { error } = await supabase
          .from('session_metadata')
          .insert({
            session_id: newSessionId,
            project_id: projectId,
            question_number: questionNumber,
            random_seed: randomSeed,
            app_version: appVersion,
            target_per_response: DEFAULT_CONFIG.targetPerResponse,
            reviewer_target_per_person: requiredComparisonsPerStudent,
            pairing_strategy: DEFAULT_CONFIG.pairingStrategy,
            k_elo: DEFAULT_CONFIG.kElo,
            allow_tie: DEFAULT_CONFIG.allowTie,
            short_response_threshold_ms: DEFAULT_CONFIG.shortResponseThresholdMs,
            consecutive_bias_threshold: DEFAULT_CONFIG.consecutiveBiasThreshold,
            mirror_reshow_gap: DEFAULT_CONFIG.mirrorReshowGap,
            duplicate_reeval_gap: DEFAULT_CONFIG.duplicateReevalGap,
            agreement_update_interval: DEFAULT_CONFIG.agreementUpdateInterval,
            global_score_refresh_interval: DEFAULT_CONFIG.globalScoreRefreshInterval,
          });

        if (error) {
          console.error('Error creating session metadata:', error);
          if (error.code === '42501') {
            throw new Error('세션 생성 권한이 없습니다. 활성 프로젝트인지 확인해주세요.');
          }
          throw new Error('세션 생성 중 오류가 발생했습니다.');
        }

        setSessionMetadata({
          sessionId: newSessionId,
          projectId,
          questionNumber,
          randomSeed,
          appVersion,
          startedAt: new Date(),
          config: {
            ...DEFAULT_CONFIG,
            reviewerTargetPerPerson: requiredComparisonsPerStudent
          }
        });
      }
      
      lastUpdatedNumResponses.current = numResponses;
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, questionNumber, numResponses, generateSessionId, generateRandomSeed, getAppVersion, calculateReviewerTarget]);

  // 기존 세션의 동적 업데이트: numResponses가 변경되면 기존 세션도 업데이트
  const updateSessionIfNeeded = useCallback(async () => {
    if (!sessionMetadata || !numResponses || numResponses <= 0) return;
    
    // 이미 같은 numResponses로 업데이트했으면 스킵
    if (lastUpdatedNumResponses.current === numResponses) return;
    
    const newTarget = await calculateReviewerTarget(numResponses);
    
    // 기존 값과 다르면 업데이트
    if (newTarget !== sessionMetadata.config.reviewerTargetPerPerson) {
      console.log(`Updating session target: ${sessionMetadata.config.reviewerTargetPerPerson} -> ${newTarget}`);
      
      const { error } = await supabase
        .from('session_metadata')
        .update({ reviewer_target_per_person: newTarget })
        .eq('session_id', sessionMetadata.sessionId);
      
      if (error) {
        console.error('Error updating session:', error);
        return;
      }
      
      setSessionMetadata(prev => prev ? {
        ...prev,
        config: {
          ...prev.config,
          reviewerTargetPerPerson: newTarget
        }
      } : null);
      
      lastUpdatedNumResponses.current = numResponses;
    }
  }, [sessionMetadata, numResponses, calculateReviewerTarget]);

  const closeSession = useCallback(async () => {
    if (!sessionMetadata) return;

    try {
      await supabase
        .from('session_metadata')
        .update({ closed_at: new Date().toISOString() })
        .eq('session_id', sessionMetadata.sessionId);
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }, [sessionMetadata]);

  const updateSessionConfig = useCallback(async (newConfig: Partial<SessionConfig>) => {
    if (!sessionMetadata) return;

    try {
      const updatedConfig = { ...sessionMetadata.config, ...newConfig };
      
      await supabase
        .from('session_metadata')
        .update({
          target_per_response: updatedConfig.targetPerResponse,
          reviewer_target_per_person: updatedConfig.reviewerTargetPerPerson,
          pairing_strategy: updatedConfig.pairingStrategy,
          k_elo: updatedConfig.kElo,
          allow_tie: updatedConfig.allowTie,
          short_response_threshold_ms: updatedConfig.shortResponseThresholdMs,
          consecutive_bias_threshold: updatedConfig.consecutiveBiasThreshold,
          mirror_reshow_gap: updatedConfig.mirrorReshowGap,
          duplicate_reeval_gap: updatedConfig.duplicateReevalGap,
          agreement_update_interval: updatedConfig.agreementUpdateInterval,
          global_score_refresh_interval: updatedConfig.globalScoreRefreshInterval,
        })
        .eq('session_id', sessionMetadata.sessionId);

      setSessionMetadata(prev => prev ? {
        ...prev,
        config: updatedConfig
      } : null);
    } catch (error) {
      console.error('Error updating session config:', error);
    }
  }, [sessionMetadata]);

  // 세션 초기화
  useEffect(() => {
    if (projectId && questionNumber && numResponses && numResponses > 0) {
      initializeSession();
    }
  }, [projectId, questionNumber, numResponses, initializeSession]);

  // 기존 세션 업데이트 (numResponses 변경 시)
  useEffect(() => {
    if (sessionMetadata && numResponses && numResponses > 0) {
      updateSessionIfNeeded();
    }
  }, [sessionMetadata, numResponses, updateSessionIfNeeded]);

  return {
    sessionMetadata,
    isLoading,
    initializeSession,
    closeSession,
    updateSessionConfig
  };
};
