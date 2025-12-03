import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReviewerStats {
  studentId: string;
  projectId: string;
  questionNumber: number;
  totalComparisons: number;
  consecutiveLeftChoices: number;
  consecutiveRightChoices: number;
  maxConsecutiveLeft: number;
  maxConsecutiveRight: number;
  shortDecisionCount: number;
  shortDecisionStreaks: number;
  agreementRate: number;
  inconsistencyCount: number;
  inconsistencyRate: number;
  finalWeightApplied: number;
  lowAgreementFlag: boolean;
  lastPopupAt: Date | null;
  popupCooldownRemaining: number;
}

interface UseQualityManagerProps {
  studentId: string;
  projectId: string;
  questionNumber: number;
  config: {
    shortResponseThresholdMs: number;
    consecutiveBiasThreshold: number;
    mirrorReshowGap: number;
    duplicateReevalGap: number;
  };
}

export const useQualityManager = ({ 
  studentId, 
  projectId, 
  questionNumber, 
  config 
}: UseQualityManagerProps) => {
  const [reviewerStats, setReviewerStats] = useState<ReviewerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const consecutiveShortResponses = useRef(0);
  const lastDecisionTimes = useRef<number[]>([]);

  // Initialize or load reviewer stats
  const initializeStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to get existing stats
      const { data: existingStats, error: selectError } = await supabase
        .from('reviewer_stats')
        .select('*')
        .eq('student_id', studentId)
        .eq('project_id', projectId)
        .eq('question_number', questionNumber)
        .maybeSingle();

      if (selectError) {
        console.error('Error fetching reviewer stats:', selectError);
        throw selectError;
      }

      if (existingStats) {
        setReviewerStats({
          studentId: existingStats.student_id,
          projectId: existingStats.project_id,
          questionNumber: existingStats.question_number,
          totalComparisons: existingStats.total_comparisons,
          consecutiveLeftChoices: existingStats.consecutive_left_choices,
          consecutiveRightChoices: existingStats.consecutive_right_choices,
          maxConsecutiveLeft: existingStats.max_consecutive_left,
          maxConsecutiveRight: existingStats.max_consecutive_right,
          shortDecisionCount: existingStats.short_response_count,
          shortDecisionStreaks: existingStats.short_decision_streaks,
          agreementRate: existingStats.agreement_score || 0,
          inconsistencyCount: existingStats.inconsistency_count,
          inconsistencyRate: existingStats.inconsistency_rate,
          finalWeightApplied: existingStats.final_weight_applied,
          lowAgreementFlag: existingStats.low_agreement_flag,
          lastPopupAt: existingStats.last_popup_at ? new Date(existingStats.last_popup_at) : null,
          popupCooldownRemaining: existingStats.popup_cooldown_remaining,
        });
      } else {
        // Create new stats
        const { error: insertError } = await supabase
          .from('reviewer_stats')
          .insert({
            student_id: studentId,
            project_id: projectId,
            question_number: questionNumber,
            total_comparisons: 0,
            consecutive_left_choices: 0,
            consecutive_right_choices: 0,
            max_consecutive_left: 0,
            max_consecutive_right: 0,
            short_response_count: 0,
            short_decision_streaks: 0,
            agreement_score: 0.0,
            inconsistency_count: 0,
            inconsistency_rate: 0.0,
            final_weight_applied: 1.0,
            low_agreement_flag: false,
            popup_cooldown_remaining: 0,
          });

        if (insertError) {
          console.error('Error inserting reviewer stats:', insertError);
          throw insertError;
        }

        setReviewerStats({
          studentId,
          projectId,
          questionNumber,
          totalComparisons: 0,
          consecutiveLeftChoices: 0,
          consecutiveRightChoices: 0,
          maxConsecutiveLeft: 0,
          maxConsecutiveRight: 0,
          shortDecisionCount: 0,
          shortDecisionStreaks: 0,
          agreementRate: 0.0,
          inconsistencyCount: 0,
          inconsistencyRate: 0.0,
          finalWeightApplied: 1.0,
          lowAgreementFlag: false,
          lastPopupAt: null,
          popupCooldownRemaining: 0,
        });
      }
    } catch (error) {
      console.error('Error initializing reviewer stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, projectId, questionNumber]);

  // Check for bias patterns and trigger mirror reshow
  const checkBiasPattern = useCallback((decision: 'left' | 'right') => {
    if (!reviewerStats) return { shouldMirror: false, mirrorType: null };

    const consecutiveThreshold = config.consecutiveBiasThreshold;
    let shouldMirror = false;
    let mirrorType: 'consecutive_bias' | null = null;

    if (decision === 'left') {
      const newConsecutiveLeft = reviewerStats.consecutiveLeftChoices + 1;
      if (newConsecutiveLeft >= consecutiveThreshold) {
        shouldMirror = true;
        mirrorType = 'consecutive_bias';
      }
    } else if (decision === 'right') {
      const newConsecutiveRight = reviewerStats.consecutiveRightChoices + 1;
      if (newConsecutiveRight >= consecutiveThreshold) {
        shouldMirror = true;
        mirrorType = 'consecutive_bias';
      }
    }

    return { shouldMirror, mirrorType };
  }, [reviewerStats, config.consecutiveBiasThreshold]);

  // Check for short response patterns
  const checkShortResponsePattern = useCallback((decisionTimeMs: number) => {
    const isShortResponse = decisionTimeMs < config.shortResponseThresholdMs;
    let shouldShowPopup = false;

    if (isShortResponse) {
      consecutiveShortResponses.current += 1;
      lastDecisionTimes.current.push(decisionTimeMs);
      
      // Keep only last 5 decision times
      if (lastDecisionTimes.current.length > 5) {
        lastDecisionTimes.current.shift();
      }

      // Check if we have 3 consecutive short responses
      if (consecutiveShortResponses.current >= 3) {
        const now = new Date();
        const lastPopup = reviewerStats?.lastPopupAt;
        const cooldownPeriod = 10; // 10 comparisons cooldown
        
        // Check if we're not in cooldown
        if (!lastPopup || reviewerStats!.popupCooldownRemaining <= 0) {
          shouldShowPopup = true;
          consecutiveShortResponses.current = 0; // Reset after showing popup
        }
      }
    } else {
      consecutiveShortResponses.current = 0; // Reset on normal response
    }

    return { isShortResponse, shouldShowPopup };
  }, [config.shortResponseThresholdMs, reviewerStats]);

  // Show quality warning popup
  const showQualityWarning = useCallback(async (reason: string) => {
    const now = new Date();
    
    toast({
      title: "응답 품질 개선 요청",
      description: "충분히 읽고 신중하게 판단해 주세요.",
      duration: 4000,
    });

    // Update stats with popup info
    if (reviewerStats) {
      await updateStats({
        lastPopupAt: now,
        popupCooldownRemaining: 10, // 10 comparisons cooldown
      });
    }

    return { popupShown: true, popupReason: reason, popupAt: now };
  }, [toast, reviewerStats]);

  // Update reviewer stats
  const updateStats = useCallback(async (updates: Partial<ReviewerStats>) => {
    if (!reviewerStats) return;

    try {
      const updatedStats = { ...reviewerStats, ...updates };
      
      await supabase
        .from('reviewer_stats')
        .update({
          total_comparisons: updatedStats.totalComparisons,
          consecutive_left_choices: updatedStats.consecutiveLeftChoices,
          consecutive_right_choices: updatedStats.consecutiveRightChoices,
          max_consecutive_left: updatedStats.maxConsecutiveLeft,
          max_consecutive_right: updatedStats.maxConsecutiveRight,
          short_response_count: updatedStats.shortDecisionCount,
          short_decision_streaks: updatedStats.shortDecisionStreaks,
          agreement_score: updatedStats.agreementRate,
          inconsistency_count: updatedStats.inconsistencyCount,
          inconsistency_rate: updatedStats.inconsistencyRate,
          final_weight_applied: updatedStats.finalWeightApplied,
          low_agreement_flag: updatedStats.lowAgreementFlag,
          last_popup_at: updatedStats.lastPopupAt?.toISOString(),
          popup_cooldown_remaining: updatedStats.popupCooldownRemaining,
        })
        .eq('student_id', studentId)
        .eq('project_id', projectId)
        .eq('question_number', questionNumber);

      setReviewerStats(updatedStats);
    } catch (error) {
      console.error('Error updating reviewer stats:', error);
    }
  }, [reviewerStats, studentId, projectId, questionNumber]);

  // Process a comparison decision
  const processDecision = useCallback(async (
    decision: 'left' | 'right' | 'neutral',
    decisionTimeMs: number
  ) => {
    if (!reviewerStats) return null;

    const updates: Partial<ReviewerStats> = {
      totalComparisons: reviewerStats.totalComparisons + 1,
      popupCooldownRemaining: Math.max(0, reviewerStats.popupCooldownRemaining - 1),
    };

    // Update consecutive choice counters
    if (decision === 'left') {
      updates.consecutiveLeftChoices = reviewerStats.consecutiveLeftChoices + 1;
      updates.consecutiveRightChoices = 0;
      updates.maxConsecutiveLeft = Math.max(
        reviewerStats.maxConsecutiveLeft, 
        updates.consecutiveLeftChoices
      );
    } else if (decision === 'right') {
      updates.consecutiveRightChoices = reviewerStats.consecutiveRightChoices + 1;
      updates.consecutiveLeftChoices = 0;
      updates.maxConsecutiveRight = Math.max(
        reviewerStats.maxConsecutiveRight, 
        updates.consecutiveRightChoices
      );
    } else {
      updates.consecutiveLeftChoices = 0;
      updates.consecutiveRightChoices = 0;
    }

    // Check patterns
    const biasCheck = checkBiasPattern(decision as 'left' | 'right');
    const shortResponseCheck = checkShortResponsePattern(decisionTimeMs);

    if (shortResponseCheck.isShortResponse) {
      updates.shortDecisionCount = reviewerStats.shortDecisionCount + 1;
    }

    // Handle popup if needed
    let popupInfo = null;
    if (shortResponseCheck.shouldShowPopup) {
      popupInfo = await showQualityWarning('short_streak');
      updates.shortDecisionStreaks = reviewerStats.shortDecisionStreaks + 1;
    }

    await updateStats(updates);

    return {
      shouldMirror: biasCheck.shouldMirror,
      mirrorType: biasCheck.mirrorType,
      shouldShowPopup: shortResponseCheck.shouldShowPopup,
      popupInfo,
      isShortResponse: shortResponseCheck.isShortResponse,
    };
  }, [reviewerStats, checkBiasPattern, checkShortResponsePattern, showQualityWarning, updateStats]);

  return {
    reviewerStats,
    isLoading,
    initializeStats,
    processDecision,
    updateStats,
  };
};
