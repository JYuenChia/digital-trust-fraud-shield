import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTour } from '@/contexts/TourContext';
import { 
  ShieldCheck, 
  UserPlus, 
  Smartphone
} from 'lucide-react';

const LESSON_STORAGE_KEY = 'fraud-shield-lesson-v1';
const LESSON_POINTS_STORAGE_KEY = 'fraud-shield-lesson-points-v1';

const LESSON_CARDS = [
  {
    title: 'What Is Fraud?',
    desc: 'Fraud means someone lies or hides the truth to get your money, goods, or personal details.',
  },
  {
    title: 'How Scammers Usually Attack',
    desc: 'They may pretend to be a buyer, bank, or officer and rush you to act fast without checking.',
  },
  {
    title: 'Simple Safety Rule',
    desc: 'Stop 10 seconds and check 3 things: name, account number, and payment reason.',
  },
];

const LESSON_QUIZ = [
  {
    id: 'q1',
    question: 'Which sentence explains fraud best?',
    options: ['A normal business payment', 'A lie or trick used to take someone\'s money', 'Any late payment fee'],
    answer: 1,
  },
  {
    id: 'q2',
    question: 'A person asks you to transfer money urgently and says “no need to check.” What is safest?',
    options: ['Transfer now because it is urgent', 'Verify identity first with a trusted contact', 'Send half now and half later'],
    answer: 1,
  },
  {
    id: 'q3',
    question: 'Before sending money, what should you always check?',
    options: ['Only the transfer amount', 'Recipient name, account number, and reason', 'Only the message screenshot'],
    answer: 1,
  },
];

// Helper component for scroll animations
const ScrollReveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ref.current?.classList.add('translate-y-0', 'opacity-100');
          ref.current?.classList.remove('translate-y-16', 'opacity-0');
        } else {
          // Fade out when scrolling up/out of view
          ref.current?.classList.add('translate-y-16', 'opacity-0');
          ref.current?.classList.remove('translate-y-0', 'opacity-100');
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-700 ease-out translate-y-16 opacity-0 ${className}`}>
      {children}
    </div>
  );
};

export default function Landing() {
  const { startTour } = useTour();
  const { t } = useLanguage();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(() => localStorage.getItem(LESSON_STORAGE_KEY) === 'completed');
  const [safetyPoints, setSafetyPoints] = useState(() => Number(localStorage.getItem(LESSON_POINTS_STORAGE_KEY) ?? '0'));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizError, setQuizError] = useState('');
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lessonStep, setLessonStep] = useState(0);

  const cardCount = LESSON_CARDS.length;
  const quizCount = LESSON_QUIZ.length;
  const resultStep = cardCount + quizCount;
  const totalLessonSteps = resultStep + 1;
  const isCardStep = lessonStep < cardCount;
  const isQuizStep = lessonStep >= cardCount && lessonStep < resultStep;
  const isResultStep = lessonStep === resultStep;
  const lessonCards = [
    {
      title: t('landing.lesson.card1Title'),
      desc: t('landing.lesson.card1Desc'),
    },
    {
      title: t('landing.lesson.card2Title'),
      desc: t('landing.lesson.card2Desc'),
    },
    {
      title: t('landing.lesson.card3Title'),
      desc: t('landing.lesson.card3Desc'),
    },
  ];

  const lessonQuiz = [
    {
      id: 'q1',
      question: t('landing.lesson.q1.question'),
      options: [
        t('landing.lesson.q1.o1'),
        t('landing.lesson.q1.o2'),
        t('landing.lesson.q1.o3'),
      ],
      answer: 1,
    },
    {
      id: 'q2',
      question: t('landing.lesson.q2.question'),
      options: [
        t('landing.lesson.q2.o1'),
        t('landing.lesson.q2.o2'),
        t('landing.lesson.q2.o3'),
      ],
      answer: 1,
    },
    {
      id: 'q3',
      question: t('landing.lesson.q3.question'),
      options: [
        t('landing.lesson.q3.o1'),
        t('landing.lesson.q3.o2'),
        t('landing.lesson.q3.o3'),
      ],
      answer: 1,
    },
  ];

  const currentCard = isCardStep ? lessonCards[lessonStep] : null;
  const currentQuiz = isQuizStep ? lessonQuiz[lessonStep - cardCount] : null;
  const currentQuizIndex = isQuizStep ? lessonStep - cardCount : -1;
  const progressPercent = ((lessonStep + 1) / totalLessonSteps) * 100;
  const computedScore = lessonQuiz.reduce((sum, quiz) => sum + (answers[quiz.id] === quiz.answer ? 1 : 0), 0);

  const moveLessonForward = () => {
    if (isQuizStep && currentQuiz && typeof answers[currentQuiz.id] !== 'number') {
      setQuizError(t('landing.lesson.selectAnswer'));
      return;
    }

    setQuizError('');
    setLessonStep((prev) => Math.min(prev + 1, resultStep));
  };

  const finishLessonGame = () => {
    setLastScore(computedScore);
    setLessonCompleted(true);
    setLessonStarted(false);
    localStorage.setItem(LESSON_STORAGE_KEY, 'completed');

    if (localStorage.getItem(LESSON_POINTS_STORAGE_KEY) === null) {
      const gainedPoints = 10;
      setSafetyPoints(gainedPoints);
      localStorage.setItem(LESSON_POINTS_STORAGE_KEY, String(gainedPoints));
    }
  };

  const playAnswerFeedbackSound = (isCorrect: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;

      const makeTone = (frequency: number, start: number, duration: number, gainPeak: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = isCorrect ? 'sine' : 'square';
        oscillator.frequency.setValueAtTime(frequency, start);

        gainNode.gain.setValueAtTime(0.0001, start);
        gainNode.gain.exponentialRampToValueAtTime(gainPeak, start + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(start);
        oscillator.stop(start + duration);
      };

      if (isCorrect) {
        makeTone(660, now, 0.12, 0.08);
        makeTone(880, now + 0.13, 0.14, 0.08);
      } else {
        makeTone(220, now, 0.16, 0.07);
        makeTone(160, now + 0.14, 0.18, 0.07);
      }
    } catch {
      // Ignore audio errors to keep gameplay smooth.
    }
  };

  const features = [
    {
      num: '01.',
      title: t('landing.features.f1Title'),
      desc: t('landing.features.f1Desc'),
      highlight: false
    },
    {
      num: '02.',
      title: t('landing.features.f2Title'),
      desc: t('landing.features.f2Desc'),
      highlight: true
    },
    {
      num: '03.',
      title: t('landing.features.f3Title'),
      desc: t('landing.features.f3Desc'),
      highlight: false
    },
    {
      num: '04.',
      title: t('landing.features.f4Title'),
      desc: t('landing.features.f4Desc'),
      highlight: false
    }
  ];

  const hiwSteps = [
    {
      num: '1',
      title: t('landing.hiw.s1Title'),
      desc: t('landing.hiw.s1Desc')
    },
    {
      num: '2',
      title: t('landing.hiw.s2Title'),
      desc: t('landing.hiw.s2Desc')
    },
    {
      num: '3',
      title: t('landing.hiw.s3Title'),
      desc: t('landing.hiw.s3Desc')
    },
    {
      num: '4',
      title: t('landing.hiw.s4Title'),
      desc: t('landing.hiw.s4Desc')
    }
  ];

  const guideSteps = [
    {
      icon: <UserPlus className="text-orange-500" size={24} />,
      title: t('landing.guide.step1Title'),
      desc: t('landing.guide.step1Desc')
    },
    {
      icon: <ShieldCheck className="text-orange-500" size={24} />,
      title: t('landing.guide.step2Title'),
      desc: t('landing.guide.step2Desc')
    },
    {
      icon: <Smartphone className="text-orange-500" size={24} />,
      title: t('landing.guide.step3Title'),
      desc: t('landing.guide.step3Desc')
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0C0C0C] font-['Inter'] flex flex-col items-center overflow-x-hidden pt-16 relative">
      
      {/* Background Gradients (Bottom Only) */}
      {/* Ambient Glossy Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        {/* Center Glow */}
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.55] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        {/* Left Glow */}
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.12] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        {/* Right Glow */}
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1547px] relative z-10 px-4 md:px-10 flex flex-col gap-10 py-10">
        
        {/* Intro Area */}
        <ScrollReveal className="flex flex-col items-center gap-[80px] pt-[60px] pb-[80px] w-full mt-10 relative">
          
          {/* Subtle Orange Glow behind text */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#FF5500] opacity-[0.15] blur-[120px] rounded-full pointer-events-none z-[-1]" />
          
          <div className="flex flex-col items-center gap-8 w-full max-w-4xl text-center">
            
            <h1 className="text-[#111827] dark:text-white font-['Sora'] text-[46px] sm:text-[64px] font-[800] leading-[1.1] md:tracking-[-2px]">
              <span className="text-[#FF5500]">{t('landing.hero.highlight')}</span> {t('landing.hero.titleRest')}
            </h1>
            
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[15px] sm:text-[18px] leading-[1.6] max-w-3xl px-2">
              {t('landing.hero.subtitleLine1')}<br className="hidden md:block" />
              {t('landing.hero.subtitleLine2')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4 w-full sm:w-auto px-4 sm:px-0">
              <button
                type="button"
                data-tour="landing-cta"
                onClick={startTour}
                className="w-full sm:w-auto bg-[#FF3B30] border border-[#FF5500] text-[#111827] dark:text-white px-8 py-4 rounded-lg font-['Inter'] font-semibold text-[15px] cursor-pointer hover:bg-[#E0352B] transition-colors"
              >
                {t('landing.hero.startTour')}
              </button>
              <button onClick={() => window.open('https://github.com/JYuenChia/digital-trust-fraud-shield.git', '_blank')} className="w-full sm:w-auto bg-[#FFFFFF]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-2xl border border-black/20 dark:border-white/20 text-[#111827] dark:text-white px-8 py-4 rounded-lg font-['Inter'] font-semibold text-[15px] cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                {t('landing.hero.viewDocs')}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Fraud 101 Lesson (Landing Only) */}
        <ScrollReveal className="flex flex-col gap-6 py-2 w-full">
          <div data-tour="landing-lesson-game" className="rounded-2xl border border-[#FF5500]/35 bg-[#FFFFFF]/75 dark:bg-[#1A1A1A]/80 backdrop-blur-xl p-6 md:p-8 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#FF5500] font-bold">{t('landing.lesson.badge')}</p>
                <h2 className="mt-1 text-[#111827] dark:text-white font-['Sora'] text-2xl font-bold">{t('landing.lesson.title')}</h2>
                <p className="mt-1 text-sm text-[#6B7280] dark:text-[#A0A0A0]">{t('landing.lesson.subtitle')}</p>
              </div>
              {lessonCompleted && !lessonStarted && (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#32D74B1F] border border-[#32D74B55] px-3 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#32D74B]">{t('landing.lesson.scamAware')}</span>
                  <span className="text-[11px] font-semibold text-[#111827] dark:text-white">+{safetyPoints} {t('landing.lesson.safetyPoints')}</span>
                </div>
              )}
            </div>

            {!lessonStarted && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#141414] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-sm text-[#4B5563] dark:text-[#B7B7B7]">
                  {lessonCompleted
                    ? `${t('landing.lesson.completedPrefix')}${lastScore !== null ? ` (${lastScore}/3 ${t('landing.lesson.correct')})` : ''}. ${t('landing.lesson.completedSuffix')}`
                    : t('landing.lesson.intro')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLessonStarted(true);
                    setQuizError('');
                    setAnswers({});
                    setLessonStep(0);
                  }}
                  className="rounded-lg bg-[#FF5500] hover:bg-[#E04B00] transition-colors px-4 py-2.5 text-sm font-bold text-[#111827] dark:text-white"
                >
                  {lessonCompleted ? t('landing.lesson.playAgain') : t('landing.lesson.startGame')}
                </button>
              </div>
            )}

            {lessonStarted && (
              <>
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#141414] p-4 md:p-5">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] font-bold">
                    <span className="text-[#FF5500]">
                      {isCardStep ? `${t('landing.lesson.learningRound')} ${lessonStep + 1}/3` : isQuizStep ? `${t('landing.lesson.quizRound')} ${currentQuizIndex + 1}/3` : t('landing.lesson.rewardRound')}
                    </span>
                    <span className="text-[#6B7280] dark:text-[#A0A0A0]">{t('landing.lesson.step')} {lessonStep + 1}/{totalLessonSteps}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#FF5500] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#141414] p-4 md:p-5 flex flex-col gap-4">
                  {isCardStep && currentCard && (
                    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#101010] p-4 flex flex-col gap-3">
                      <h3 className="text-[#111827] dark:text-white font-['Sora'] text-lg font-bold">{currentCard.title}</h3>
                      <p className="text-sm text-[#5C6470] dark:text-[#B6B6B6] leading-7">{currentCard.desc}</p>
                    </div>
                  )}

                  {isQuizStep && currentQuiz && (
                    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#101010] p-4">
                      <p className="text-sm font-semibold text-[#111827] dark:text-white">{currentQuizIndex + 1}. {currentQuiz.question}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {currentQuiz.options.map((option, optionIdx) => {
                          const selected = answers[currentQuiz.id];
                          const isSelected = selected === optionIdx;
                          return (
                            <button
                              key={`${currentQuiz.id}-${optionIdx}`}
                              type="button"
                              onClick={() => {
                                setAnswers((prev) => ({ ...prev, [currentQuiz.id]: optionIdx }));
                                setQuizError('');
                                playAnswerFeedbackSound(optionIdx === currentQuiz.answer);
                              }}
                              className={`text-left rounded-lg px-3 py-2 text-sm border transition-colors ${isSelected ? 'border-[#FF5500] bg-[#FF5500]/10 text-[#111827] dark:text-white font-semibold' : 'border-black/10 dark:border-white/10 text-[#4B5563] dark:text-[#B7B7B7] hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                              {option}
                            </button>
                          );
                        })}

                        {typeof answers[currentQuiz.id] === 'number' && (
                          <p className={`mt-2 text-xs font-semibold ${answers[currentQuiz.id] === currentQuiz.answer ? 'text-[#32D74B]' : 'text-[#FF9F0A]'}`}>
                            {answers[currentQuiz.id] === currentQuiz.answer ? t('landing.lesson.correctFeedback') : t('landing.lesson.wrongFeedback')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isResultStep && (
                    <div className="rounded-lg border border-[#32D74B55] bg-[#32D74B12] p-4 flex flex-col gap-2">
                      <h3 className="text-[#111827] dark:text-white font-['Sora'] text-lg font-bold">{t('landing.lesson.missionResult')}</h3>
                      <p className="text-sm text-[#425466] dark:text-[#C7D0DB]">{t('landing.lesson.youScored').replace('{score}', String(computedScore))}</p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#32D74B1F] border border-[#32D74B55] px-3 py-1 w-fit">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#32D74B]">{t('landing.lesson.scamAware')}</span>
                        <span className="text-[11px] font-semibold text-[#111827] dark:text-white">{t('landing.lesson.rewardLabel')}</span>
                      </div>
                    </div>
                  )}

                  {quizError && <p className="text-sm text-[#FF3B30]">{quizError}</p>}

                  <div className="flex flex-wrap items-center gap-3">
                    {!isResultStep && (
                      <button
                        type="button"
                        onClick={moveLessonForward}
                        className="rounded-lg bg-[#FF5500] hover:bg-[#E04B00] transition-colors px-4 py-2.5 text-sm font-bold text-[#111827] dark:text-white"
                      >
                        {t('landing.lesson.nextRound')}
                      </button>
                    )}
                    {isResultStep && (
                      <button
                        type="button"
                        onClick={finishLessonGame}
                        className="rounded-lg bg-[#32D74B] hover:bg-[#2DC146] transition-colors px-4 py-2.5 text-sm font-bold text-[#111111]"
                      >
                        {t('landing.lesson.claimReward')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setLessonStarted(false);
                        setQuizError('');
                      }}
                      className="rounded-lg border border-black/15 dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-[#6B7280] dark:text-[#A0A0A0] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {t('landing.lesson.maybeLater')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollReveal>

        {/* Feature Section */}
        <ScrollReveal className="flex flex-col gap-[60px] py-[80px] w-full">
          {/* Feature Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 w-full">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[32px] md:text-[40px] font-bold leading-tight">
                {t('landing.features.headingLine1')}<br className="hidden md:block" />
                <span className="text-[#FF5500]">{t('landing.features.headingLine2')}</span>
              </h2>
            </div>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[15px] md:text-[16px] leading-[1.6] max-w-full md:max-w-[400px] text-left md:text-right">
              {t('landing.features.subLine1')}<br className="hidden md:block" />
              {t('landing.features.subLine2')}
            </p>
          </div>

          {/* Carousel */}
          <div data-tour="landing-features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className="group p-8 rounded-2xl flex flex-col gap-4 min-h-[280px] justify-start transition-all duration-300 bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 shadow-sm hover:border-[#FF5500]/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#FF5500] font-['Sora'] text-xl font-bold">
                  {feat.num}
                </div>
                <h3 className="font-['Sora'] text-xl font-bold mt-2 text-[#111827] dark:text-white">
                  {feat.title}
                </h3>
                <p className="font-['Inter'] text-sm leading-[1.6] text-[#6B7280] dark:text-[#8A8A8A]">
                  {feat.desc}
                </p>

              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* User Guide Section */}
        <ScrollReveal className="flex flex-col gap-[40px] py-[80px] w-full">
          <div className="text-center space-y-3">
            <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[32px] md:text-[40px] font-bold">
              {t('landing.guide.title')}
            </h2>
            <div className="w-20 h-1.5 bg-[#FF5500] mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full mt-8">
            {guideSteps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center gap-6 group">
                <div className="w-20 h-20 rounded-full bg-white dark:bg-[#1A1A1A] shadow-xl shadow-orange-500/5 flex items-center justify-center border border-orange-100 dark:border-orange-500/20 group-hover:scale-110 transition-transform duration-500">
                  {step.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-[#111827] dark:text-white font-['Sora'] text-xl font-bold">{step.title}</h3>
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[15px] leading-relaxed max-w-[280px] mx-auto">
                    {step.desc}
                  </p>
                </div>
                {idx < guideSteps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[70%] w-[60%] border-t-2 border-dashed border-orange-200 dark:border-orange-500/20 z-[-1]" />
                )}
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* How It Works Section */}
        <ScrollReveal className="flex flex-col gap-[60px] py-[80px] w-full">
          <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[28px] md:text-[40px] font-bold">
            {t('landing.hiw.title')}
          </h2>
          
          <div className="flex flex-col w-full">
            {hiwSteps.map((step, idx) => (
              <div key={idx} className="flex flex-row gap-0 group">
                <div className="w-[60px] md:w-[150px] shrink-0 border-r border-[#FF3B3020] relative pt-4 md:pt-6 pb-8 md:pb-12 pr-4 md:pr-8 text-right">
                  <span className="text-[#FF5500] font-['Sora'] text-[32px] font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {step.num}
                  </span>
                  {/* Timeline dot */}
                  <div className="absolute right-[-6px] top-6 md:top-9 w-3 h-3 rounded-full bg-[#FF5500] shadow-[0_0_10px_#FF5500]" />
                </div>
                <div className="pt-4 md:pt-6 pb-8 md:pb-12 pl-6 md:pl-12 flex flex-col gap-2 md:gap-3">
                  <h3 className="text-[#111827] dark:text-white font-['Sora'] text-xl md:text-2xl font-bold">
                    {step.title}
                  </h3>
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[14px] md:text-[16px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </div>
  );
}
