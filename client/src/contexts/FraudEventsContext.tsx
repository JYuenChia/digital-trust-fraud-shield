import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type FraudEventStatus = 'APPROVED' | 'FLAGGED' | 'BLOCKED';

export type FraudEvent = {
  id: string;
  timestamp: string;
  user: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  currency: string;
  status: FraudEventStatus;
  riskScore: number;
  modelScore: number;
  reasonCode: string;
  recommendation: string;
  deviceProfile: 'demo-web' | 'demo-new-device';
  ipProfile: 'auto' | 'clean' | 'risky';
};

type FraudEventsContextType = {
  events: FraudEvent[];
  addEvent: (event: FraudEvent) => void;
  updateEventStatus: (id: string, status: FraudEventStatus, appendedReason?: string) => void;
  clearEvents: () => void;
};

const STORAGE_KEY = 'fraud-shield-events-v1';

const FraudEventsContext = createContext<FraudEventsContextType | undefined>(undefined);

export function FraudEventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<FraudEvent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FraudEvent[];
      if (Array.isArray(parsed)) {
        setEvents(parsed);
      }
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Ignore storage write failures in demo mode.
    }
  }, [events]);

  const value = useMemo<FraudEventsContextType>(() => {
    return {
      events,
      addEvent: (event) => {
        setEvents((prev) => [event, ...prev].slice(0, 200));
      },
      updateEventStatus: (id, status, appendedReason) => {
        setEvents((prev) => 
          prev.map((e) => 
            e.id === id 
              ? { ...e, status, reasonCode: appendedReason ? `${e.reasonCode} - ${appendedReason}` : e.reasonCode } 
              : e
          )
        );
      },
      clearEvents: () => {
        setEvents([]);
      },
    };
  }, [events]);

  return <FraudEventsContext.Provider value={value}>{children}</FraudEventsContext.Provider>;
}

export function useFraudEvents() {
  const ctx = useContext(FraudEventsContext);
  if (!ctx) {
    throw new Error('useFraudEvents must be used within a FraudEventsProvider');
  }
  return ctx;
}
