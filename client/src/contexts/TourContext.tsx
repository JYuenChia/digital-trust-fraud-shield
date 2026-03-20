import React, { createContext, useContext, useMemo, useState } from 'react';

export type TourStep = {
  id: string;
  route: string;
  selector: string;
  title: string;
  description: string;
  actionLabel?: string;
};

type TourStatus = 'idle' | 'running' | 'completed' | 'dismissed';

type TourContextValue = {
  steps: TourStep[];
  status: TourStatus;
  currentStepIndex: number;
  currentStep: TourStep | null;
  isRunning: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  dismissTour: () => void;
};

const TOUR_STORAGE_KEY = 'fraud-shield-tour-v1';

const TOUR_STEPS: TourStep[] = [
  {
    id: 'profile-security',
    route: '/profile',
    selector: '[data-tour="profile-security"]',
    title: 'Set Up Your Profile First',
    description: 'Start here by reviewing your account details and security settings.',
  },
  {
    id: 'profile-wallet-pin',
    route: '/profile',
    selector: '[data-tour="profile-wallet-pin"]',
    title: 'Enable Wallet PIN',
    description: 'Turn on Wallet PIN so every transaction requires your 6-digit approval.',
  },
  {
    id: 'transaction-form',
    route: '/transaction',
    selector: '[data-tour="transaction-form"]',
    title: 'Prepare a Secure Transfer',
    description: 'Enter recipient and transfer details before running fraud checks.',
  },
  {
    id: 'transaction-submit',
    route: '/transaction',
    selector: '[data-tour="transaction-submit"]',
    title: 'Submit for Protection Check',
    description: 'This action triggers AI fraud analysis and PIN verification.',
  },
  {
    id: 'dashboard-stats',
    route: '/dashboard',
    selector: '[data-tour="dashboard-stats"]',
    title: 'Monitor Your Security Overview',
    description: 'Track transaction activity, fraud rate, and blocked threats in one place.',
  },
  {
    id: 'dashboard-alerts',
    route: '/dashboard',
    selector: '[data-tour="dashboard-alerts"]',
    title: 'Review Real-Time Alerts',
    description: 'Use this panel to inspect flagged and blocked transactions quickly.',
  },
  {
    id: 'tour-done',
    route: '/',
    selector: '[data-tour="landing-cta"]',
    title: 'You Are Ready',
    description: 'Setup complete. You can now use the app with profile protection and fraud monitoring.',
    actionLabel: 'OK, Start Using App',
  },
];

const TourContext = createContext<TourContextValue | null>(null);

function getInitialStatus(): TourStatus {
  const persisted = localStorage.getItem(TOUR_STORAGE_KEY);
  if (persisted === 'completed') return 'completed';
  if (persisted === 'dismissed') return 'dismissed';
  return 'idle';
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TourStatus>(() => getInitialStatus());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = status === 'running' ? TOUR_STEPS[currentStepIndex] : null;

  const value = useMemo<TourContextValue>(() => {
    const startTour = () => {
      setCurrentStepIndex(0);
      setStatus('running');
    };

    const nextStep = () => {
      setCurrentStepIndex((prev) => {
        if (prev >= TOUR_STEPS.length - 1) {
          localStorage.setItem(TOUR_STORAGE_KEY, 'completed');
          setStatus('completed');
          return prev;
        }
        return prev + 1;
      });
    };

    const prevStep = () => {
      setCurrentStepIndex((prev) => Math.max(0, prev - 1));
    };

    const completeTour = () => {
      localStorage.setItem(TOUR_STORAGE_KEY, 'completed');
      setStatus('completed');
    };

    const dismissTour = () => {
      localStorage.setItem(TOUR_STORAGE_KEY, 'dismissed');
      setStatus('dismissed');
    };

    return {
      steps: TOUR_STEPS,
      status,
      currentStepIndex,
      currentStep,
      isRunning: status === 'running',
      startTour,
      nextStep,
      prevStep,
      completeTour,
      dismissTour,
    };
  }, [status, currentStepIndex, currentStep]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}
