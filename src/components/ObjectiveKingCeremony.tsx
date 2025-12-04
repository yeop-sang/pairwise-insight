import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useReviewerAlignment, AlignmentItem } from '@/hooks/useReviewerAlignment';
import { Trophy, Crown, Star, X, Loader2, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    if (!data || phase === 'loading' || phase === 'error') return;

    const timers: NodeJS.Timeout[] = [];

    if (phase === 'intro') {
      timers.push(setTimeout(() => setPhase('third'), 2000));
    } else if (phase === 'third') {
      timers.push(setTimeout(() => setPhase('second'), 3500));
    } else if (phase === 'second') {
      timers.push(setTimeout(() => setPhase('first'), 3500));
    } else if (phase === 'first') {
      setShowConfetti(true);
      timers.push(setTimeout(() => setPhase('podium'), 4000));
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, data]);

  const getWinner = (rank: number): AlignmentItem | null => {
    if (!data?.items) return null;
    return data.items[rank - 1] || null;
  };

  // 화려한 리본 효과
  const renderRibbons = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={`ribbon-${i}`}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-100px',
            animation: `ribbon-fall ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <div
            className="w-3 h-16 rounded-full"
            style={{
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][i % 8],
              transform: `rotate(${Math.random() * 30 - 15}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );

  // 종 효과
  const renderBells = () => (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div className="absolute top-4 left-8 text-6xl animate-bell-swing">🔔</div>
      <div className="absolute top-4 right-8 text-6xl animate-bell-swing" style={{ animationDelay: '0.3s' }}>🔔</div>
      <div className="absolute top-12 left-1/4 text-4xl animate-bell-swing" style={{ animationDelay: '0.5s' }}>🔔</div>
      <div className="absolute top-12 right-1/4 text-4xl animate-bell-swing" style={{ animationDelay: '0.7s' }}>🔔</div>
    </div>
  );

  // 폭죽 효과
  const renderFireworks = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-5">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={`fw-${i}`}
          className="absolute w-2 h-2 rounded-full animate-firework"
          style={{
            left: `${20 + Math.random() * 60}%`,
            bottom: '0',
            background: ['#FFD700', '#FF0000', '#00FF00', '#FF00FF', '#00FFFF'][i % 5],
            animationDelay: `${Math.random() * 1}s`,
            boxShadow: `0 0 10px currentColor, 0 0 20px currentColor`,
          }}
        />
      ))}
    </div>
  );

  // 별똥별 효과
  const renderShootingStars = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-shooting-star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            animationDelay: `${Math.random() * 3}s`,
            boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700, 0 0 30px #FFD700',
          }}
        />
      ))}
    </div>
  );

  // 반짝이 폭발 효과
  const renderSparkleExplosion = (color: string) => (
    <div className="absolute inset-0 pointer-events-none z-30">
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * 360;
        const distance = 150 + Math.random() * 100;
        return (
          <div
            key={`spark-${i}`}
            className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full animate-explode-out"
            style={{
              background: color,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
              '--angle': `${angle}deg`,
              '--distance': `${distance}px`,
              animationDelay: `${Math.random() * 0.3}s`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );

  // 거대한 컨페티 효과
  const renderMassiveConfetti = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={`confetti-${i}`}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animation: `confetti-fall ${2 + Math.random() * 3}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <div
            className="w-4 h-4"
            style={{
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF69B4', '#00CED1'][i % 10],
              transform: `rotate(${Math.random() * 360}deg)`,
              borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '0' : '2px',
            }}
          />
        </div>
      ))}
    </div>
  );

  // 화려한 수상자 발표 카드
  const renderWinnerCard = (rank: number, winner: AlignmentItem | null, isActive: boolean) => {
    if (!winner) return null;

    const configs = {
      1: {
        medal: '🥇',
        bgGradient: 'from-yellow-400 via-amber-500 to-yellow-600',
        glowColor: 'rgba(255, 215, 0, 0.8)',
        title: '🏆 객관왕 🏆',
        particles: '#FFD700',
        ringColor: 'ring-yellow-400',
      },
      2: {
        medal: '🥈',
        bgGradient: 'from-slate-300 via-gray-400 to-slate-500',
        glowColor: 'rgba(192, 192, 192, 0.6)',
        title: '✨ 2위 ✨',
        particles: '#C0C0C0',
        ringColor: 'ring-slate-400',
      },
      3: {
        medal: '🥉',
        bgGradient: 'from-orange-400 via-amber-600 to-orange-700',
        glowColor: 'rgba(205, 127, 50, 0.6)',
        title: '🌟 3위 🌟',
        particles: '#CD7F32',
        ringColor: 'ring-orange-400',
      },
    }[rank]!;

    return (
      <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'animate-screen-flash' : ''}`}>
        {/* 배경 폭발 효과 */}
        {isActive && renderSparkleExplosion(configs.particles)}
        {isActive && renderRibbons()}
        {isActive && rank === 1 && renderBells()}
        {isActive && rank === 1 && renderFireworks()}
        
        {/* 방사형 광선 효과 */}
        {isActive && (
          <div 
            className="absolute inset-0 animate-spin-slow opacity-30"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${configs.glowColor}, transparent, ${configs.glowColor}, transparent)`,
            }}
          />
        )}

        {/* 메인 카드 */}
        <div
          className={`relative z-50 transform transition-all duration-500
            ${isActive ? 'animate-mega-zoom-in scale-100 opacity-100' : 'scale-0 opacity-0'}`}
        >
          {/* 외부 글로우 링 */}
          <div 
            className={`absolute -inset-8 rounded-full animate-pulse-glow`}
            style={{ 
              background: `radial-gradient(circle, ${configs.glowColor} 0%, transparent 70%)`,
            }}
          />
          
          {/* 회전하는 별 장식 */}
          <div className="absolute -inset-16 animate-spin-slow">
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <Star 
                key={i}
                className="absolute w-8 h-8 text-yellow-400"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${deg}deg) translateY(-120px)`,
                }}
              />
            ))}
          </div>

          {/* 카드 본체 */}
          <div
            className={`relative p-12 rounded-3xl bg-gradient-to-br ${configs.bgGradient} 
              shadow-2xl ring-8 ${configs.ringColor} ring-opacity-50
              ${rank === 1 ? 'animate-golden-pulse' : 'animate-medal-swing'}`}
            style={{
              boxShadow: `0 0 60px ${configs.glowColor}, 0 0 120px ${configs.glowColor}`,
            }}
          >
            {/* 반짝이 효과 */}
            <Sparkles className="absolute top-4 left-4 w-8 h-8 text-white/60 animate-sparkle" />
            <Sparkles className="absolute top-4 right-4 w-8 h-8 text-white/60 animate-sparkle" style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute bottom-4 left-4 w-8 h-8 text-white/60 animate-sparkle" style={{ animationDelay: '0.3s' }} />
            <Sparkles className="absolute bottom-4 right-4 w-8 h-8 text-white/60 animate-sparkle" style={{ animationDelay: '0.7s' }} />

            <div className="text-center">
              {/* 메달 */}
              <div className="text-9xl mb-4 animate-bounce-dramatic filter drop-shadow-2xl">
                {configs.medal}
              </div>
              
              {/* 타이틀 */}
              <div className="text-3xl font-black text-white mb-4 drop-shadow-lg animate-pulse">
                {configs.title}
              </div>
              
              {/* 이름 - 대형 강조 */}
              <div 
                className="text-6xl font-black text-white mb-4 drop-shadow-2xl animate-name-glow"
                style={{
                  textShadow: `0 0 20px ${configs.glowColor}, 0 0 40px ${configs.glowColor}, 0 0 60px ${configs.glowColor}`,
                }}
              >
                {winner.name}
              </div>
              
              {/* 학번 */}
              <div className="text-2xl font-bold text-white/90 mb-6">
                {winner.student_code}
              </div>
              
              {/* 일치도 */}
              <div className="px-8 py-4 bg-black/30 rounded-2xl backdrop-blur-sm">
                <div className="text-5xl font-black text-white animate-score-pop">
                  {(winner.alignment_score * 100).toFixed(1)}%
                </div>
                <div className="text-xl text-white/80 mt-2">일치도</div>
                <div className="text-lg text-white/70 mt-1">
                  ({winner.matches}/{winner.total_comparisons}회 일치)
                </div>
              </div>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in overflow-hidden">
        {showConfetti && renderMassiveConfetti()}
        {showConfetti && renderShootingStars()}
        {showConfetti && renderBells()}
        
        {/* 배경 광선 */}
        <div 
          className="absolute inset-0 animate-spin-slow opacity-20"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(255,215,0,0.3), transparent, rgba(255,215,0,0.3), transparent)',
          }}
        />
        
        <div className="relative z-10 text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-14 h-14 text-yellow-500 animate-bounce-dramatic" />
            <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent animate-pulse drop-shadow-lg">
              🏆 객관왕 시상식 🏆
            </h2>
            <Crown className="w-14 h-14 text-yellow-500 animate-bounce-dramatic" style={{ animationDelay: '0.2s' }} />
          </div>
          <p className="text-xl text-muted-foreground">최종 점수와 가장 일치하는 판단을 한 학생들</p>
        </div>

        {/* 시상대 */}
        <div className="relative z-10 flex items-end justify-center gap-6 mt-4">
          {/* 2위 */}
          <div className="flex flex-col items-center animate-podium-rise" style={{ animationDelay: '0.3s' }}>
            <div className="text-6xl mb-3 animate-medal-swing">🥈</div>
            <div className="text-center mb-3 p-4 bg-slate-500/20 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black text-slate-200">{second?.name || '-'}</div>
              <div className="text-sm text-slate-400">{second?.student_code}</div>
              <div className="text-3xl font-black text-slate-300 mt-2">
                {second ? `${(second.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="w-36 h-40 bg-gradient-to-t from-slate-500 to-slate-400 rounded-t-xl flex items-center justify-center shadow-2xl border-4 border-slate-300">
              <span className="text-6xl font-black text-white/90">2</span>
            </div>
          </div>

          {/* 1위 */}
          <div className="flex flex-col items-center animate-podium-rise" style={{ animationDelay: '0s' }}>
            <div className="text-8xl mb-3 animate-bounce-dramatic">🥇</div>
            <div className="text-center mb-3 p-5 bg-yellow-500/30 rounded-xl backdrop-blur-sm animate-golden-pulse">
              <div 
                className="text-3xl font-black text-yellow-200"
                style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}
              >
                {first?.name || '-'}
              </div>
              <div className="text-base text-yellow-300/80">{first?.student_code}</div>
              <div 
                className="text-4xl font-black text-yellow-400 mt-2"
                style={{ textShadow: '0 0 30px rgba(255,215,0,1)' }}
              >
                {first ? `${(first.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div 
              className="w-44 h-56 bg-gradient-to-t from-yellow-600 to-amber-400 rounded-t-xl flex items-center justify-center shadow-2xl border-4 border-yellow-300 animate-golden-pulse"
              style={{ boxShadow: '0 0 40px rgba(255,215,0,0.5)' }}
            >
              <span className="text-7xl font-black text-white">1</span>
            </div>
          </div>

          {/* 3위 */}
          <div className="flex flex-col items-center animate-podium-rise" style={{ animationDelay: '0.5s' }}>
            <div className="text-6xl mb-3 animate-medal-swing" style={{ animationDelay: '0.2s' }}>🥉</div>
            <div className="text-center mb-3 p-4 bg-orange-500/20 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black text-orange-200">{third?.name || '-'}</div>
              <div className="text-sm text-orange-400">{third?.student_code}</div>
              <div className="text-3xl font-black text-orange-300 mt-2">
                {third ? `${(third.alignment_score * 100).toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="w-36 h-32 bg-gradient-to-t from-orange-700 to-amber-500 rounded-t-xl flex items-center justify-center shadow-2xl border-4 border-orange-400">
              <span className="text-6xl font-black text-white/90">3</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="relative z-10 mt-10 px-8 py-3 text-lg bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-xl"
        >
          🎉 닫기
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[700px] p-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-yellow-500/30">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="relative w-full h-full flex items-center justify-center">
          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-yellow-500" />
                <div className="absolute inset-0 animate-ping">
                  <Loader2 className="w-16 h-16 text-yellow-500/30" />
                </div>
              </div>
              <p className="text-xl text-yellow-200/80">객관왕을 찾는 중...</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-xl text-red-400 font-medium">{error || '데이터를 불러올 수 없습니다.'}</p>
              <p className="text-muted-foreground">비교 데이터가 충분하지 않을 수 있습니다.</p>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
                닫기
              </Button>
            </div>
          )}

          {/* Intro */}
          {phase === 'intro' && (
            <div className="flex flex-col items-center gap-8 animate-fade-in">
              {renderShootingStars()}
              <div className="relative">
                <Trophy className="w-32 h-32 text-yellow-500 animate-bounce-dramatic" />
                <div className="absolute inset-0">
                  <Star className="absolute -top-4 -left-4 w-10 h-10 text-yellow-400 animate-sparkle" />
                  <Star className="absolute -top-2 -right-6 w-8 h-8 text-yellow-400 animate-sparkle" style={{ animationDelay: '0.3s' }} />
                  <Star className="absolute -bottom-2 left-0 w-9 h-9 text-yellow-400 animate-sparkle" style={{ animationDelay: '0.6s' }} />
                  <Star className="absolute bottom-0 -right-4 w-7 h-7 text-yellow-400 animate-sparkle" style={{ animationDelay: '0.9s' }} />
                </div>
              </div>
              <div className="text-center">
                <h2 
                  className="text-5xl font-black text-yellow-400 mb-4"
                  style={{ textShadow: '0 0 30px rgba(255,215,0,0.5)' }}
                >
                  🎯 객관왕을 찾습니다...
                </h2>
                <p className="text-xl text-yellow-200/70">최종 점수와 가장 일치하는 판단을 한 학생은?</p>
              </div>
              <div className="flex gap-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-yellow-400 animate-bounce"
                    style={{ 
                      animationDelay: `${i * 0.15}s`,
                      boxShadow: '0 0 10px rgba(255,215,0,0.8)',
                    }}
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
