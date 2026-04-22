import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Link } from 'wouter';
import { RotateCcw } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';
import { useLanguage } from '@/contexts/LanguageContext';

type SwipeDirection = 'safe' | 'scam';
type ScenarioChannel = 'sms' | 'bank-message' | 'email' | 'whatsapp' | 'video-call';

type Scenario = {
  id: string;
  level: 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  channel: ScenarioChannel;
  title: string;
  sender: string;
  preview: string;
  message: string;
  type: SwipeDirection;
  redFlag: string;
  education: string;
};

type OnboardingScoreResponse = {
  scenario_set: string;
  score: number;
  total: number;
  accuracy: number;
  friction_tier: 'strict' | 'balanced' | 'light';
  guardian_protocol: {
    mode: 'strict' | 'balanced' | 'light';
    pin_required: boolean;
    face_id_for_flagged: boolean;
    guardian_review_threshold: number;
    default_note: string;
  };
  next_step: string;
};

type FeedbackState = {
  isCorrect: boolean;
  choice: SwipeDirection;
  expected: SwipeDirection;
  redFlag: string;
  education: string;
};

const cardVariants = {
  enter: { y: 20, opacity: 0, scale: 0.98 },
  center: { y: 0, opacity: 1, scale: 1 },
  exit: (direction: SwipeDirection) => ({
    x: direction === 'safe' ? 360 : -360,
    rotate: direction === 'safe' ? 10 : -10,
    opacity: 0,
    scale: 0.95,
  }),
};

const deriveLocalSummary = (score: number, total: number): OnboardingScoreResponse => {
  const safeTotal = Math.max(1, total);
  const accuracy = score / safeTotal;

  if (accuracy < 0.4) {
    return {
      scenario_set: 'asean-swipe-shield',
      score,
      total: safeTotal,
      accuracy,
      friction_tier: 'strict',
      guardian_protocol: {
        mode: 'strict',
        pin_required: true,
        face_id_for_flagged: true,
        guardian_review_threshold: 0.35,
        default_note: 'Extra Checks Required',
      },
      next_step: 'Profile set to STRICT security mode.',
    };
  }

  if (accuracy < 0.8) {
    return {
      scenario_set: 'asean-swipe-shield',
      score,
      total: safeTotal,
      accuracy,
      friction_tier: 'balanced',
      guardian_protocol: {
        mode: 'balanced',
        pin_required: true,
        face_id_for_flagged: true,
        guardian_review_threshold: 0.45,
        default_note: 'Normal Security Level',
      },
      next_step: 'Profile set to BALANCED security mode.',
    };
  }

  return {
    scenario_set: 'asean-swipe-shield',
    score,
    total: safeTotal,
    accuracy,
    friction_tier: 'light',
    guardian_protocol: {
      mode: 'light',
      pin_required: true,
      face_id_for_flagged: false,
      guardian_review_threshold: 0.55,
      default_note: 'Smart Friction Mode',
    },
    next_step: 'Profile set to SMART security mode.',
  };
};

const getChannelLabel = (channel: ScenarioChannel, t: (key: string) => string): string => {
  switch (channel) {
    case 'sms':
      return t('swipe.channel.sms');
    case 'bank-message':
      return t('swipe.channel.bankMessage');
    case 'email':
      return t('swipe.channel.email');
    case 'whatsapp':
      return t('swipe.channel.whatsapp');
    case 'video-call':
      return t('swipe.channel.videoCall');
    default:
      return t('swipe.channel.message');
  }
};

function playTone(ctx: AudioContext, frequency: number, durationSec: number, type: OscillatorType, gainValue: number, startAt: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec);
}

export default function SwipeShield() {
  const { t } = useLanguage();
  const scenarios: Scenario[] = [
    {
      id: 'urgent-account-lock',
      level: 'Very Easy',
      channel: 'sms',
      title: t('swipe.s1.title'),
      sender: '+6012-389-0041',
      preview: t('swipe.s1.preview'),
      message: t('swipe.s1.message'),
      type: 'scam',
      redFlag: t('swipe.s1.redFlag'),
      education: t('swipe.s1.education'),
    },
    {
      id: 'official-otp-request',
      level: 'Easy',
      channel: 'email',
      title: t('swipe.s2.title'),
      sender: 'MAYBANK SECURITY CENTER',
      preview: t('swipe.s2.preview'),
      message: t('swipe.s2.message'),
      type: 'scam',
      redFlag: t('swipe.s2.redFlag'),
      education: t('swipe.s2.education'),
    },
    {
      id: 'lhdn-refund',
      level: 'Medium',
      channel: 'email',
      title: t('swipe.s3.title'),
      sender: 'refund-notice@lhdn-tax-gov.com',
      preview: t('swipe.s3.preview'),
      message: t('swipe.s3.message'),
      type: 'scam',
      redFlag: t('swipe.s3.redFlag'),
      education: t('swipe.s3.education'),
    },
    {
      id: 'struggling-friend',
      level: 'Hard',
      channel: 'whatsapp',
      title: t('swipe.s4.title'),
      sender: t('swipe.s4.sender'),
      preview: t('swipe.s4.preview'),
      message: t('swipe.s4.message'),
      type: 'scam',
      redFlag: t('swipe.s4.redFlag'),
      education: t('swipe.s4.education'),
    },
    {
      id: 'deepfake-ai-call',
      level: 'Extreme',
      channel: 'video-call',
      title: t('swipe.s5.title'),
      sender: t('swipe.s5.sender'),
      preview: t('swipe.s5.preview'),
      message: t('swipe.s5.message'),
      type: 'scam',
      redFlag: t('swipe.s5.redFlag'),
      education: t('swipe.s5.education'),
    },
  ];
  const total = scenarios.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastDirection, setLastDirection] = useState<SwipeDirection>('scam');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const [syncResult, setSyncResult] = useState<OnboardingScoreResponse | null>(null);
  const submittedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const currentScenario = scenarios[currentIndex];
  const isComplete = currentIndex >= total;
  const progressPercent = Math.round((currentIndex / total) * 100);

  const confettiBits = useMemo(() => {
    return Array.from({ length: 20 }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 0.5,
      duration: 1.9 + Math.random() * 0.9,
      xShift: (Math.random() - 0.5) * 220,
      emoji: ['*', '+', 'o', '@'][index % 4],
      color: ['#FFE066', '#5AF78E', '#61AFEF', '#FF6B6B'][index % 4],
    }));
  }, []);

  const getLevelLabel = (level: Scenario['level']) => {
    if (level === 'Very Easy') return t('swipe.level.veryEasy');
    if (level === 'Easy') return t('swipe.level.easy');
    if (level === 'Medium') return t('swipe.level.medium');
    if (level === 'Hard') return t('swipe.level.hard');
    return t('swipe.level.extreme');
  };

  const playFeedbackAudio = (isCorrect: boolean) => {
    try {
      const ctx = audioRef.current ?? new window.AudioContext();
      audioRef.current = ctx;
      const now = ctx.currentTime;

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      if (isCorrect) {
        playTone(ctx, 740, 0.13, 'triangle', 0.18, now);
        playTone(ctx, 980, 0.16, 'triangle', 0.15, now + 0.08);
      } else {
        playTone(ctx, 180, 0.22, 'sawtooth', 0.16, now);
        playTone(ctx, 130, 0.25, 'sawtooth', 0.14, now + 0.08);
      }
    } catch {
      // Ignore autoplay/device errors.
    }
  };

  const submitScore = async () => {
    const fallback = deriveLocalSummary(score, total);
    setSyncStatus('syncing');

    try {
      const response = await fetch(`${FRAUD_API_BASE_URL}/api/v1/onboarding/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          total,
          scenario_set: 'asean-swipe-shield',
        }),
      });

      if (!response.ok) {
        throw new Error(`Score sync failed: ${response.status}`);
      }

      const data = (await response.json()) as OnboardingScoreResponse;
      setSyncResult(data);
      setSyncStatus('synced');
      localStorage.setItem('swipe-shield-score-v1', JSON.stringify(data));
      return;
    } catch {
      setSyncResult(fallback);
      setSyncStatus('offline');
      localStorage.setItem('swipe-shield-score-v1', JSON.stringify(fallback));
    }
  };

  useEffect(() => {
    if (!isComplete || submittedRef.current) return;
    submittedRef.current = true;
    void submitScore();
  }, [isComplete]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        void audioRef.current.close();
      }
    };
  }, []);

  const restartGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setFeedback(null);
    setIsLocked(false);
    setLastDirection('scam');
    setSyncStatus('idle');
    setSyncResult(null);
    submittedRef.current = false;
  };

  const handleChoice = (choice: SwipeDirection) => {
    if (isLocked || !currentScenario) return;

    const isCorrect = choice === currentScenario.type;
    setIsLocked(true);
    setLastDirection(choice);
    setFeedback({
      isCorrect,
      choice,
      expected: currentScenario.type,
      redFlag: currentScenario.redFlag,
      education: currentScenario.education,
    });

    playFeedbackAudio(isCorrect);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      if (navigator.vibrate) {
        navigator.vibrate([18, 32, 18]);
      }
    } else if (navigator.vibrate) {
      navigator.vibrate([95, 40, 95]);
    }

    window.setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setFeedback(null);
      setIsLocked(false);
    }, 1800);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 90) return;
    handleChoice(info.offset.x > 0 ? 'safe' : 'scam');
  };

  const renderScenarioSurface = (scenario: Scenario) => {
    if (scenario.channel === 'sms') {
      return (
        <div className="w-full rounded-3xl bg-[#111827] text-white overflow-hidden border border-white/10 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
          <div className="h-7 px-4 bg-black/35 text-[10px] flex items-center justify-between text-[#CFD7E6]">
            <span>9:41</span>
            <span>5G 87%</span>
          </div>
          <div className="px-4 py-3 bg-[#1F2937] border-b border-white/10">
                  <p className="text-xs text-[#A9B7CF]">{t('swipe.surface.messages')}</p>
            <p className="text-sm font-semibold">{scenario.sender}</p>
          </div>
          <div className="p-4 bg-[#0B1220] min-h-[320px]">
            <div className="max-w-[88%] rounded-2xl bg-[#1E293B] px-4 py-3 text-sm leading-6 border border-[#334155]">
              {scenario.message}
            </div>
            <p className="mt-3 text-[11px] text-[#8AA0C5]">Today 9:42 AM</p>
          </div>
        </div>
      );
    }

    if (scenario.channel === 'bank-message') {
      return (
        <div className="w-full rounded-3xl overflow-hidden border border-[#1D4ED8]/35 shadow-[0_20px_60px_rgba(10,40,100,0.45)] bg-white">
          <div className="bg-[#0B3D91] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Maybank2u Secure Center</p>
              <p className="font-semibold text-sm">Fraud Detection Notice</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#FACC15] text-[#0B3D91] flex items-center justify-center font-bold">M</div>
          </div>
          <div className="p-5 bg-[#F8FBFF] min-h-[320px]">
            <div className="rounded-2xl border border-[#D7E5FF] bg-white p-4">
              <p className="text-xs text-[#48639D]">From: {scenario.sender}</p>
              <p className="mt-2 text-[#111827] text-sm leading-6">{scenario.message}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="rounded-xl py-2 text-xs font-semibold text-white bg-[#1D4ED8]">{t('swipe.surface.replyOtp')}</button>
              <button className="rounded-xl py-2 text-xs font-semibold text-[#1D4ED8] border border-[#1D4ED8]">{t('swipe.surface.ignore')}</button>
            </div>
          </div>
        </div>
      );
    }

    if (scenario.channel === 'email') {
      return (
        <div className="w-full rounded-3xl overflow-hidden border border-[#CBD5E1] shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-white">
          <div className="bg-[#EEF2FF] border-b border-[#CBD5E1] px-4 py-3">
            <p className="text-xs text-[#64748B]">Inbox</p>
            <p className="text-sm font-semibold text-[#0F172A]">
              {scenario.id === 'official-otp-request' ? 'Maybank Security Verification' : 'LHDN Tax Refund Notice'}
            </p>
          </div>
          <div className="p-5 min-h-[320px] bg-[#F8FAFC]">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              {scenario.id === 'official-otp-request' && (
                <div className="mb-3 rounded-lg bg-[#0B3D91] px-3 py-2 text-xs text-white font-semibold inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#FACC15] text-[#0B3D91] font-bold flex items-center justify-center">M</span>
                  {t('swipe.surface.maybankNotice')}
                </div>
              )}
              <p className="text-[11px] text-[#64748B]">From: {scenario.sender}</p>
              <p className="text-[11px] text-[#64748B] mt-1">
                {t('swipe.surface.subject')}: {scenario.id === 'official-otp-request' ? t('swipe.surface.subjectOtp') : t('swipe.surface.subjectRefund')}
              </p>
              <p className="mt-3 text-sm text-[#1E293B] leading-6">{scenario.message}</p>
              <button className="mt-4 rounded-lg bg-[#2563EB] text-white text-xs font-semibold px-3 py-2">
                {scenario.id === 'official-otp-request' ? t('swipe.surface.replyWithOtp') : t('swipe.surface.goSecurePortal')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (scenario.channel === 'whatsapp') {
      return (
        <div className="w-full rounded-3xl overflow-hidden border border-[#14532D]/40 shadow-[0_22px_65px_rgba(0,40,20,0.45)] bg-[#0F172A]">
          <div className="bg-[#14532D] text-white px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#A7F3D0] text-[#14532D] font-bold flex items-center justify-center">AM</div>
            <div>
              <p className="text-sm font-semibold">{scenario.sender}</p>
              <p className="text-[11px] text-[#B8F2D3]">{t('swipe.surface.online')}</p>
            </div>
          </div>
          <div className="p-4 min-h-[320px] bg-[linear-gradient(180deg,#052E16,#064E3B)]">
            <div className="max-w-[88%] ml-auto rounded-2xl bg-[#DCF8C6] text-[#111827] px-4 py-3 text-sm leading-6">
              {scenario.message}
            </div>
            <div className="mt-4 rounded-xl bg-white/90 px-3 py-2 text-xs text-[#111827] max-w-[78%]">
              {t('swipe.surface.beneficiaryMismatch')}: <span className="font-semibold">MUHAMMAD RAZAK ENTERPRISE</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full rounded-3xl overflow-hidden border border-[#E11D48]/35 shadow-[0_22px_65px_rgba(80,0,30,0.45)] bg-[#020617] text-white">
        <div className="px-4 py-3 border-b border-white/10 bg-[#111827] flex items-center justify-between">
          <p className="text-sm font-semibold">{t('swipe.surface.incomingCall')}</p>
          <p className="text-xs text-[#FCA5A5]">{t('swipe.surface.unstable')}</p>
        </div>
        <div className="relative min-h-[320px] p-4 bg-[radial-gradient(circle_at_30%_20%,#1E1B4B,transparent_60%),radial-gradient(circle_at_80%_70%,#3F0F2E,transparent_60%),#030712]">
          <motion.div
            className="absolute inset-4 rounded-2xl border-2 border-[#22D3EE]/70"
            animate={{ boxShadow: ['0 0 0 rgba(34,211,238,0.0)', '0 0 30px rgba(34,211,238,0.45)', '0 0 0 rgba(34,211,238,0.0)'] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <div className="relative h-full rounded-2xl border border-white/15 bg-black/45 p-4">
            <p className="text-xs text-[#93C5FD]">{t('swipe.s5.sender')}</p>
            <p className="mt-3 text-sm leading-6 text-[#F1F5F9]">{scenario.message}</p>
            <div className="mt-4 rounded-xl border border-[#FCA5A5]/40 bg-[#7F1D1D]/35 p-3 text-xs">
              {t('swipe.surface.qrPayRequest')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#0F172A,#020617_58%)] font-['Inter'] flex flex-col items-center justify-center px-4 py-20 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-44 right-0 w-96 h-96 bg-fuchsia-500 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {!isComplete ? (
          <>
            <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/80 text-sm font-bold uppercase tracking-wider">{t('swipe.levelOf').replace('{current}', String(currentIndex + 1)).replace('{total}', String(total))}</span>
                <span className="text-white/80 text-sm font-bold uppercase tracking-wider">{progressPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {currentScenario && (
                <motion.div
                  key={currentScenario.id}
                  custom={lastDirection}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  drag={isLocked ? false : 'x'}
                  dragElastic={0.15}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  className="relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl p-4 md:p-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#0EA5E9]/25 text-[#7DD3FC] text-xs font-semibold px-3 py-1">{getChannelLabel(currentScenario.channel, t)}</span>
                    <span className="rounded-full bg-[#A855F7]/25 text-[#E9D5FF] text-xs font-semibold px-3 py-1">{getLevelLabel(currentScenario.level)}</span>
                    <span className="rounded-full bg-[#34D399]/25 text-[#A7F3D0] text-xs font-semibold px-3 py-1">{currentScenario.title}</span>
                  </div>

                  {renderScenarioSurface(currentScenario)}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChoice('scam')}
                      disabled={isLocked}
                      className="rounded-2xl py-3.5 px-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #EF4444 0%, #FB7185 100%)', color: '#fff' }}
                    >
                      {t('swipe.swipeLeftScam')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChoice('safe')}
                      disabled={isLocked}
                      className="rounded-2xl py-3.5 px-4 text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10B981 0%, #22D3EE 100%)', color: '#fff' }}
                    >
                      {t('swipe.swipeRightSafe')}
                    </button>
                  </div>

                  <p className="mt-3 text-center text-xs text-[#C7D2FE]">{t('swipe.dragOrTap')}</p>

                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        className="absolute inset-3 z-20 rounded-2xl bg-black/82 border-2 border-[#FACC15] p-4 md:p-5 flex flex-col justify-center"
                      >
                        <p className={`text-xl md:text-2xl font-bold ${feedback.isCorrect ? 'text-[#4ADE80]' : 'text-[#FB7185]'}`}>
                          {feedback.isCorrect ? t('swipe.correct') : t('swipe.notQuite')}
                        </p>
                        <p className="mt-1 text-sm text-white/80">
                          {t('swipe.feedbackChoice').replace('{choice}', feedback.choice).replace('{expected}', feedback.expected)}
                        </p>

                        <div className="mt-4 rounded-xl bg-[#FACC15] text-[#111827] p-3">
                          <p className="text-[11px] uppercase font-black tracking-wider">{t('swipe.redFlag')}</p>
                          <p className="mt-1 text-sm font-semibold leading-6">{feedback.redFlag}</p>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-3">
                          <p className="text-[11px] uppercase font-black tracking-wider text-[#FCD34D]">{t('swipe.whyThisMatters')}</p>
                          <p className="mt-1 text-sm text-white leading-6">{feedback.education}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          syncResult && (
            <>
              <div className="fixed inset-0 pointer-events-none z-20">
                {confettiBits.map((bit) => (
                  <motion.div
                    key={bit.id}
                    className="fixed text-3xl font-black"
                    initial={{ y: 0, x: 0, opacity: 0, scale: 0 }}
                    animate={{ y: -420, x: bit.xShift, opacity: [0, 1, 0], scale: [0, 1, 0.6], rotate: 360 }}
                    transition={{ delay: bit.delay, duration: bit.duration, ease: 'easeOut' }}
                    style={{ left: bit.left, color: bit.color }}
                  >
                    {bit.emoji}
                  </motion.div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/8 backdrop-blur-xl p-8 md:p-10 text-center">
                <div className="inline-flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-[#0B1120] font-['Sora'] text-5xl font-bold shadow-[0_18px_50px_rgba(0,200,170,0.35)]">
                  {score}/{total}
                </div>

                <h2 className="mt-5 text-4xl md:text-5xl font-bold text-white font-['Sora']">
                  {syncResult.accuracy >= 0.8 ? t('swipe.excellent') : syncResult.accuracy >= 0.4 ? t('swipe.goodWork') : t('swipe.practiceMore')}
                </h2>
                <p className="mt-2 text-white/75 text-sm md:text-base">{syncResult.friction_tier === 'strict' ? t('swipe.nextStep.strict') : syncResult.friction_tier === 'balanced' ? t('swipe.nextStep.balanced') : t('swipe.nextStep.light')}</p>

                <div className="mt-6 rounded-2xl bg-black/25 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/65">{t('swipe.accuracy')}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{Math.round(syncResult.accuracy * 100)}%</p>
                  <p className="mt-1 text-sm text-[#A7F3D0]">{t('swipe.frictionTier')}: <span className="uppercase font-semibold">{syncResult.friction_tier}</span></p>
                  <p className="mt-1 text-xs text-white/70">{syncStatus === 'offline' ? t('swipe.savedOffline') : t('swipe.syncedApi')}</p>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={restartGame}
                    className="rounded-2xl py-3.5 px-4 text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95"
                  >
                    <RotateCcw className="inline mr-2" size={18} />
                    {t('swipe.playAgain')}
                  </button>
                  <Link href="/transaction">
                    <div className="rounded-2xl py-3.5 px-4 text-base font-bold text-white bg-gradient-to-r from-fuchsia-500 to-violet-500 text-center cursor-pointer hover:opacity-95">
                      {t('swipe.backToApp')}
                    </div>
                  </Link>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
