import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useReviewerAlignment, AlignmentItem } from '@/hooks/useReviewerAlignment';
import { Trophy, Crown, Medal, Star, X, Loader2 } from 'lucide-react';

interface ObjectiveKingCeremonyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  questionNumber?: number;
}

type CeremonyPhase = 'loading' | 'intro' | 'third' | 'second' | 'first' | 'podium' | 'error';

export const ObjectiveKingCeremony: React.FC<ObjectiveKingCeremonyProps> = ({
  open,
  onOpenChange,
  projectId,
  questionNumber,
}) => {
  const { data, loading, error, fetchAlignment, reset } = useReviewerAlignment();
  const [phase, setPhase] = useState<CeremonyPhase>('loading');
  const [showConfetti, setShowConfetti] = useState(false);

  const startCeremony = useCallback(async () => {
    setPhase('loading');
    try {
      await fetchAlignment({ projectId, questionNumber, topN: 3 });
      setPhase('intro');
    } catch {
      setPhase('error');
    }
  }, [fetchAlignment, projectId, questionNumber]);

  useEffect(() => {
    if (open) {
      startCeremony();
    } else {
      reset();
      setPhase('loading');
      setShowConfetti(false);
    }
  }, [open, startCeremony, reset]);

  // Phase transitions
  useEffect(() => {
    if (!data || phase === 'loading' || phase === 'error') return;

    const timers: NodeJS.Timeout[] = [];

    if (phase === 'intro') {
      timers.push(setTimeout(() => setPhase('third'), 1500));
    } else if (phase === 'third') {
      timers.push(setTimeout(() => setPhase('second'), 2500));
    } else if (phase === 'second') {
      timers.push(setTimeout(() => setPhase('first'), 2500));
    } else if (phase === 'first') {
      setShowConfetti(true);
      timers.push(setTimeout(() => setPhase('podium'), 3000));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, data]);

  const getWinner = (rank: number): AlignmentItem | null => {
    if (!data?.items) return null;
    return data.items[rank - 1] || null;
  };

  const renderParticles = (count: number, color: string) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full animate-particle"
          style={{
            backgroundColor: color,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1 + Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );

  const renderConfetti = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-4 animate-confetti"
          style={{
            backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 6],
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );

  const renderWinnerCard = (rank: number, winner: AlignmentItem | null, isActive: boolean) => {
    if (!winner) return null;

    const configs = {
      1: {
        medal: '🥇',
        bgGradient: 'from-yellow-400 via-amber-500 to-yellow-600',
        textColor: 'text-yellow-100',
        shadowColor: 'shadow-yellow-500/50',
        title: '🏆 객관왕',
        particles: '#FFD700',
      },
      2: {
        medal: '🥈',
        bgGradient: 'from-slate-300 via-gray-400 to-slate-500',
        textColor: 'text-slate-100',
        shadowColor: 'shadow-slate-400/50',
        title: '2위',
        particles: '#C0C0C0',
      },
      3: {
        medal: '🥉',
        bgGradient: 'from-orange-400 via-amber-600 to-orange-700',
        textColor: 'text-orange-100',
        shadowColor: 'shadow-orange-500/50',
        title: '3위',
        particles: '#CD7F32',
      },
    }[rank]!;

    return (
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-700
          ${isActive ? 'animate-zoom-in-bounce scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      >
        {isActive && renderParticles(20, configs.particles)}
        
        {/* Glow effect for 1st place */}
        {rank === 1 && isActive && (
          <div className="absolute inset-0 animate-golden-glow rounded-3xl" />
        )}

        <div
          className={`relative z-10 p-8 rounded-3xl bg-gradient-to-br ${configs.bgGradient} 
            shadow-2xl ${configs.shadowColor} transform transition-all duration-500
            ${rank === 1 ? 'animate-medal-swing' : ''}`}
        >
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce-slow">{configs.medal}</div>
            <div className={`text-xl font-bold mb-2 ${configs.textColor}`}>{configs.title}</div>
            <div className="text-4xl font-black text-white mb-2 drop-shadow-lg">
              {winner.name}
            </div>
            <div className={`text-lg font-medium ${configs.textColor}`}>
              {winner.student_code}
            </div>
            <div className="mt-4 px-6 py-2 bg-black/20 rounded-full backdrop-blur-sm">
              <span className="text-2xl font-bold text-white">
                {(winner.alignment_score * 100).toFixed(1)}%
              </span>
              <span className={`text-sm ml-2 ${configs.textColor}`}>일치도</span>
            </div>
            <div className={`text-sm mt-2 ${configs.textColor}`}>
              ({winner.matches}/{winner.total_comparisons}회 일치)
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPodium = () => {
    const first = getWinner(1);
    const second = getWinner(2);
    const third = getWinner(3);

    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in">
        {showConfetti && renderConfetti()}
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-10 h-10 text-yellow-500 animate-bounce-slow" />
            <h2 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
              객관왕 시상식
            </h2>
            <Crown className="w-10 h-10 text-yellow-500 animate-bounce-slow" />
          </div>
          <p className="text-muted-foreground">최종 점수와 가장 일치하는 판단을 한 학생들</p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mt-4">
          {/* 2nd place - left */}
          <div className="flex flex-col items-center animate-rise-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-5xl mb-2">🥈</div>
            <div className="text-center mb-2">
              <div className="text-lg font-bold">{second?.name || '-'}</div>
              <div className="text-sm text-muted-foreground">{second?.student_code}</div>
              <div className="text-xl font-bold text-primary mt-1">
                {second ? `${(second.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="w-28 h-32 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-lg flex items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-white/80">2</span>
            </div>
          </div>

          {/* 1st place - center */}
          <div className="flex flex-col items-center animate-rise-up" style={{ animationDelay: '0s' }}>
            <div className="text-6xl mb-2 animate-bounce-slow">🥇</div>
            <div className="text-center mb-2">
              <div className="text-xl font-black">{first?.name || '-'}</div>
              <div className="text-sm text-muted-foreground">{first?.student_code}</div>
              <div className="text-2xl font-bold text-yellow-500 mt-1">
                {first ? `${(first.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="w-32 h-44 bg-gradient-to-t from-yellow-500 to-amber-400 rounded-t-lg flex items-center justify-center shadow-xl animate-golden-glow">
              <span className="text-5xl font-black text-white/90">1</span>
            </div>
          </div>

          {/* 3rd place - right */}
          <div className="flex flex-col items-center animate-rise-up" style={{ animationDelay: '0.4s' }}>
            <div className="text-5xl mb-2">🥉</div>
            <div className="text-center mb-2">
              <div className="text-lg font-bold">{third?.name || '-'}</div>
              <div className="text-sm text-muted-foreground">{third?.student_code}</div>
              <div className="text-xl font-bold text-orange-500 mt-1">
                {third ? `${(third.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="w-28 h-24 bg-gradient-to-t from-orange-600 to-amber-500 rounded-t-lg flex items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-white/80">3</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="mt-8 bg-gradient-to-r from-primary to-primary/80"
        >
          닫기
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/10 border-primary/20">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="relative w-full h-full flex items-center justify-center p-8">
          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">데이터를 불러오는 중...</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error || '데이터를 불러올 수 없습니다.'}</p>
              <p className="text-sm text-muted-foreground">비교 데이터가 충분하지 않을 수 있습니다.</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
            </div>
          )}

          {/* Intro */}
          {phase === 'intro' && (
            <div className="flex flex-col items-center gap-6 animate-fade-in">
              <div className="relative">
                <Trophy className="w-24 h-24 text-yellow-500 animate-bounce-slow" />
                <div className="absolute inset-0 animate-sparkle">
                  <Star className="absolute -top-2 -left-2 w-6 h-6 text-yellow-400" />
                  <Star className="absolute -top-1 -right-3 w-4 h-4 text-yellow-400" />
                  <Star className="absolute -bottom-1 left-0 w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-black mb-2 animate-pulse">
                  🎯 객관왕을 찾습니다...
                </h2>
                <p className="text-muted-foreground">최종 점수와 가장 일치하는 판단을 한 학생은?</p>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Winner announcements */}
          {phase === 'third' && renderWinnerCard(3, getWinner(3), true)}
          {phase === 'second' && renderWinnerCard(2, getWinner(2), true)}
          {phase === 'first' && renderWinnerCard(1, getWinner(1), true)}

          {/* Final podium */}
          {phase === 'podium' && renderPodium()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
