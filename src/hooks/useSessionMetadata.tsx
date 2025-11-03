import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateRequiredComparisons } from '@/utils/comparisonCalculations';

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
  reviewerTargetPerPerson: 15,
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

  const generateSessionId = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  const generateRandomSeed = useCallback(() => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }, []);

  const getAppVersion = useCallback(() => {
    // You can replace this with actual version from package.json or build process
    return process.env.NODE_ENV === 'development' ? 'dev-1.0.0' : '1.0.0';
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
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
        // Create new session
        const newSessionId = generateSessionId();
        const randomSeed = generateRandomSeed();
        const appVersion = getAppVersion();
        
        // 응답 개수에 따른 비교 횟수 계산
        const requiredComparisons = numResponses 
          ? calculateRequiredComparisons(numResponses)
          : DEFAULT_CONFIG.reviewerTargetPerPerson;
        
        console.log(`Creating session with ${numResponses} responses, requiring ${requiredComparisons} comparisons per reviewer`);
        
        const { error } = await supabase
          .from('session_metadata')
          .insert({
            session_id: newSessionId,
            project_id: projectId,
            question_number: questionNumber,
            random_seed: randomSeed,
            app_version: appVersion,
            target_per_response: DEFAULT_CONFIG.targetPerResponse,
            reviewer_target_per_person: requiredComparisons,
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
            reviewerTargetPerPerson: requiredComparisons
          }
        });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      // Re-throw error so calling components can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, questionNumber, generateSessionId, generateRandomSeed, getAppVersion]);

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

  useEffect(() => {
    if (projectId && questionNumber) {
      initializeSession();
    }
  }, [projectId, questionNumber, initializeSession]);

  return {
    sessionMetadata,
    isLoading,
    initializeSession,
    closeSession,
    updateSessionConfig
  };
};