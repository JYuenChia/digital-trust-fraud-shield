import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useTour } from '@/contexts/TourContext';

type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

const TOOLTIP_WIDTH = 360;
const RETRY_LIMIT = 12;

function toRectLike(rect: DOMRect): RectLike {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

export default function TourOverlay() {
  const {
    currentStep,
    currentStepIndex,
    steps,
    isRunning,
    nextStep,
    prevStep,
    completeTour,
    dismissTour,
  } = useTour();
  const [location, setLocation] = useLocation();
  const [targetRect, setTargetRect] = useState<RectLike | null>(null);
  const [isMissingTarget, setIsMissingTarget] = useState(false);

  useEffect(() => {
    if (!isRunning || !currentStep) return;
    if (location !== currentStep.route) {
      setLocation(currentStep.route);
    }
  }, [isRunning, currentStep, location, setLocation]);

  useEffect(() => {
    if (!isRunning || !currentStep) {
      setTargetRect(null);
      setIsMissingTarget(false);
      return;
    }

    let retries = 0;
    let intervalId: number | null = null;

    const updateTarget = () => {
      const target = document.querySelector(currentStep.selector);
      if (!target) {
        retries += 1;
        if (retries >= RETRY_LIMIT) {
          setIsMissingTarget(true);
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
        }
        return;
      }

      const element = target as HTMLElement;
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setTargetRect(toRectLike(element.getBoundingClientRect()));
      setIsMissingTarget(false);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };

    updateTarget();
    intervalId = window.setInterval(updateTarget, 120);

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning, currentStep, location]);

  useEffect(() => {
    if (!isRunning || !currentStep) return;

    const onViewportChange = () => {
      const target = document.querySelector(currentStep.selector);
      if (!target) return;
      const element = target as HTMLElement;
      setTargetRect(toRectLike(element.getBoundingClientRect()));
    };

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [isRunning, currentStep]);

  useEffect(() => {
    if (!isRunning) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissTour();
        return;
      }

      if (!currentStep) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentStepIndex === steps.length - 1) completeTour();
        else nextStep();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, currentStep, currentStepIndex, steps.length, nextStep, prevStep, completeTour, dismissTour]);

  const tooltipPosition = useMemo(() => {
    if (!targetRect) {
      return {
        top: 120,
        left: Math.max(24, (window.innerWidth - TOOLTIP_WIDTH) / 2),
      };
    }

    const margin = 16;
    const fitsBottom = targetRect.bottom + 20 + 240 < window.innerHeight;
    const top = fitsBottom
      ? Math.min(window.innerHeight - 260, targetRect.bottom + 20)
      : Math.max(24, targetRect.top - 240);

    const centeredLeft = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
    const left = Math.min(
      window.innerWidth - TOOLTIP_WIDTH - margin,
      Math.max(margin, centeredLeft),
    );

    return { top, left };
  }, [targetRect]);

  if (!isRunning || !currentStep) return null;

  const isLast = currentStepIndex === steps.length - 1;
  const progressText = `Step ${currentStepIndex + 1} of ${steps.length}`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60" />

        {targetRect && !isMissingTarget && (
          <motion.div
            className="absolute rounded-2xl border-2 border-[#FF5500] shadow-[0_0_0_9999px_rgba(0,0,0,0.58),0_0_30px_rgba(255,85,0,0.45)] pointer-events-none"
            initial={{ opacity: 0.8 }}
            animate={{
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        )}

        <motion.div
          role="dialog"
          aria-live="polite"
          className="absolute w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 dark:border-white/10 bg-[#FFFFFF] dark:bg-[#161616] p-5 shadow-2xl"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1, top: tooltipPosition.top, left: tooltipPosition.left }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#FF5500] font-bold">Guided Tour</p>
              <h3 className="mt-1 text-[#111827] dark:text-white text-lg font-bold font-['Sora']">{currentStep.title}</h3>
            </div>
            <span className="text-xs text-[#6B7280] dark:text-[#9A9A9A]">{progressText}</span>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#4B5563] dark:text-[#B7B7B7]">
            {isMissingTarget
              ? 'This part is still loading. Continue to the next step or retry from the tour button.'
              : currentStep.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={dismissTour}
              className="rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs font-semibold text-[#6B7280] dark:text-[#A7A7A7] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 text-xs font-semibold text-[#111827] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    completeTour();
                    return;
                  }
                  nextStep();
                }}
                className="rounded-lg bg-[#FF5500] px-3 py-2 text-xs font-bold text-[#111827] dark:text-white hover:bg-[#E04B00]"
              >
                {isLast ? currentStep.actionLabel ?? 'OK' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
