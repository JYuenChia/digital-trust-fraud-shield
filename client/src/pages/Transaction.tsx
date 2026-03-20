import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Loader, CheckCircle, AlertTriangle, Play, ChevronDown, ScanLine, X, PhoneCall, Mic, MicOff, Lock, Smartphone } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FRAUD_API_BASE_URL } from '@/const';
import { useFraudEvents } from '@/contexts/FraudEventsContext';

const MALAYSIA_BANKS = [
  'Maybank',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'BSN',
  'OCBC Bank',
  'HSBC Malaysia',
  'UOB Malaysia',
  'Affin Bank',
  'Alliance Bank',
  'Bank Muamalat',
  'Standard Chartered Malaysia',
];

const MALAYSIA_EWALLETS = [
  'Touch n Go eWallet',
  'Boost',
  "GrabPay",
  'ShopeePay',
  'MAE Wallet',
  'BigPay',
  'Setel Wallet',
];

type DropdownGroup = {
  label?: string;
  options: Array<{
    label: string;
    value: string;
  }>;
};

function StyledDropdown({
  label,
  value,
  groups,
  onChange,
}: {
  label: string;
  value: string;
  groups: DropdownGroup[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = groups
    .flatMap((group) => group.options)
    .find((option) => option.value === value);

  return (
    <div ref={dropdownRef} className={`relative flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border transition-all p-4 rounded-xl ${isOpen ? 'border-[#FF5500] shadow-[0_0_20px_rgba(255,85,0,0.2)]' : 'border-black/5 dark:border-white/5'}`}>
      <label className={`text-sm cursor-default transition-colors ${isOpen ? 'text-[#FF5500]' : 'text-[#6B7280] dark:text-[#8A8A8A]'}`}>{label}</label>
      <div className="flex items-center justify-between cursor-pointer w-full" onClick={() => setIsOpen((prev) => !prev)}>
        <span className="bg-transparent text-[#111827] dark:text-white font-semibold outline-none">{selectedOption?.label ?? value}</span>
        <ChevronDown size={20} className={`text-[#6B7280] dark:text-[#8A8A8A] transition-transform ${isOpen ? 'rotate-180 text-[#FF5500]' : ''}`} />
      </div>

      {isOpen && (
        <div className="hide-scrollbar absolute top-[calc(100%+8px)] left-0 w-full min-w-full max-h-72 overflow-y-auto bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-lg p-2 shadow-2xl z-50">
          {groups.map((group, groupIndex) => (
            <div key={`${label}-${group.label ?? groupIndex}`} className="flex flex-col gap-1.5">
              {group.label && <div className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-[0.22em] text-[#6F6F6F]">{group.label}</div>}
              {group.options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm leading-snug whitespace-normal break-words ${value === option.value ? 'bg-[#FF5500]/20 text-[#FF5500] font-semibold' : 'text-slate-600 dark:text-[#E0E0E0] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {option.label}
                </div>
              ))}
              {groupIndex < groups.length - 1 && <div className="my-3 h-px bg-white/8" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type FraudResult = {
  risk_score: number;
  model_score: number;
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED' | 'PENDING_GUARDIAN';
  color: string;
  recommendation: string;
  reason_code: string;
  isVerifiedMerchant?: boolean;
  notify_guardian?: boolean;
  guardian_approval_required?: boolean;
  guardian_approval_id?: string | null;
  guardian_approval_expires_at?: string | null;
  requires_user_verification?: boolean;
  qr_integrity?: {
    merchant_id: string;
    account_name: string;
    provider: string;
    is_verified_merchant: boolean;
    merchant_age_hours: number;
    high_error_balance_ratio: number;
    signature_valid: boolean;
    warnings: string[];
    qr_type?: string;
    raw_preview?: string;
    pattern_match_percent?: number;
    pattern_match_message?: string;
  };
  score_breakdown?: {
    raw_model_score: number;
    adjustments: Array<{ factor: string; delta: number }>;
    pre_floor_score: number;
    hard_floor: number;
    hard_floor_reason: string | null;
    status_floor: number;
    final_score: number;
  };
};

type ContextResult = {
  type: 'TRANSFER' | 'CASH_OUT';
  amount: number;
  oldbalanceOrg: number;
  newbalanceOrig: number;
  oldbalanceDest: number;
  newbalanceDest: number;
  nameDest: string;
  sender_account?: string;
  hour_of_day: number;
  is_new_recipient: boolean;
  device_trust_score: number;
  ip_risk_score: number;
};

type QrPayload = {
  merchant_id?: string;
  account_name?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  created_at?: string;
  signature?: string;
  account_created_at?: string;
  high_error_balance_ratio?: number;
  is_verified_merchant?: boolean;
};

type SafetyWeatherState = 'calm' | 'cloudy' | 'storm';

type BoatProfile = {
  safePoints: number;
  damage: number;
  warningStrikes: number;
  locked: boolean;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

const BOAT_PROFILE_STORAGE_KEY = 'fraud-shield-bangka-profile-v1';
const PROFILE_PIN_STORAGE_KEY = 'fraud-shield-profile-v1-pin-value';
const SENIOR_ACCOUNT = 'ALEX8899';
const BOAT_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'A caller says your account will be blocked unless you share an OTP now. What should you do?',
    options: [
      'Share the OTP to avoid account closure',
      'Hang up and call the bank using the official number',
      'Transfer money first, then verify later',
    ],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'What is the safest action before sending money to a new recipient?',
    options: [
      'Check recipient details and verify through a trusted channel',
      'Rush the transfer if the message sounds urgent',
      'Skip verification for small amounts',
    ],
    correctIndex: 0,
  },
  {
    id: 'q3',
    question: 'If someone asks you to keep a transaction secret from family, this is usually:',
    options: [
      'A normal banking procedure',
      'A potential scam pressure tactic',
      'A reward program requirement',
    ],
    correctIndex: 1,
  },
];

function SafetyBoatCard({ profile }: { profile: BoatProfile }) {
  const damage = profile.damage;
  const warningStrikes = profile.warningStrikes;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0F141A] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-[#6B7280] dark:text-[#8A8A8A]">Safety Tracker</span>
        <span className="text-xs font-semibold text-emerald-700 dark:text-[#72E18B]">
          MONITORING
        </span>
      </div>

      <div className="relative h-24 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-blue-100 dark:bg-[#0C1C2B]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(140,210,255,0.32)_0%,rgba(53,123,185,0.52)_45%,rgba(12,49,84,0.95)_100%)]" />
        <svg viewBox="0 0 180 100" className="absolute left-3 bottom-1 h-20 w-40" aria-hidden="true">
          <path d="M20 62h120l-10 18c-2 4-6 6-11 6H42c-5 0-9-2-11-6L20 62z" fill="#D89A61" />
          <rect x="78" y="26" width="5" height="36" rx="2" fill="#B17745" />
          <path d="M82 28l35 13H82z" fill="#F7D8B2" />
          <path d="M78 30l-28 12h28z" fill="#F2CFA7" />
          <circle cx="40" cy="70" r="8" fill="none" stroke="#9EE0F7" strokeWidth="3" />

          {damage >= 20 && <path d="M65 80l8-7" stroke="#662A2A" strokeWidth="2" />}
          {damage >= 40 && <path d="M92 77l11-8" stroke="#662A2A" strokeWidth="2" />}
          {damage >= 60 && <path d="M48 74l11-8" stroke="#662A2A" strokeWidth="2" />}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-2">
          <p className="text-[#6B7280] dark:text-[#8A8A8A]">Safe Points</p>
          <p className="text-[#111827] dark:text-white font-semibold">{profile.safePoints}</p>
        </div>
        <div className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-2">
          <p className="text-[#6B7280] dark:text-[#8A8A8A]">Damage</p>
          <p className={`font-semibold ${damage >= 60 ? 'text-[#FF6B6B]' : 'text-[#111827] dark:text-white'}`}>{damage}%</p>
        </div>
        <div className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-2">
          <p className="text-[#6B7280] dark:text-[#8A8A8A]">Warning Alerts</p>
          <p className={`font-semibold ${warningStrikes >= 2 ? 'text-[#FF9F0A]' : 'text-[#111827] dark:text-white'}`}>{warningStrikes}</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-[#9CA8B5]">
        More safe transfers raise points. Repeated risky behavior increases damage and warnings.
      </p>
    </div>
  );
}

function getSafetyWeatherState(riskScore: number): SafetyWeatherState {
  if (riskScore >= 0.75) return 'storm';
  if (riskScore >= 0.35) return 'cloudy';
  return 'calm';
}

function SafetyWeatherCard({ riskScore }: { riskScore: number }) {
  const state = getSafetyWeatherState(riskScore);

  const frameClass = state === 'storm'
    ? 'safety-frame-storm'
    : state === 'cloudy'
      ? 'safety-frame-cloudy'
      : 'safety-frame-calm';

  const visualClass = state === 'storm' ? 'safety-visual-jolt' : '';

  const config = {
    calm: {
      subtitle: 'Safe to continue.',
      seaClass: 'safety-sea-calm',
      boatClass: 'safety-boat-calm',
    },
    cloudy: {
      subtitle: 'Please verify before continuing.',
      seaClass: 'safety-sea-cloudy',
      boatClass: 'safety-boat-cloudy',
    },
    storm: {
      subtitle: 'Stop. This could be a scam.',
      seaClass: 'safety-sea-storm',
      boatClass: 'safety-boat-storm',
    },
  }[state];

  return (
    <div className={`w-full rounded-2xl border bg-white dark:bg-[#101318] p-4 ${frameClass}`}>
      <div className={`relative h-28 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-slate-100 dark:bg-[#0B1118] ${visualClass}`}>
        <div className={`absolute inset-0 ${config.seaClass}`} />

        {state === 'calm' && (
          <>
            <div className="absolute top-0 right-0 h-20 w-28 safety-sun-glow" />
            <svg viewBox="0 0 48 48" className="absolute top-2 right-3 h-8 w-8 text-[#FFE79A] safety-sun-icon" fill="currentColor" aria-hidden="true">
              <circle cx="24" cy="24" r="9" />
            </svg>
          </>
        )}
        {state === 'cloudy' && (
          <>
            <svg viewBox="0 0 64 40" className="absolute top-3 right-3 h-8 w-12 text-[#B6C0CC] safety-cloud-drift" fill="currentColor" aria-hidden="true">
              <circle cx="20" cy="20" r="12" />
              <circle cx="35" cy="17" r="10" />
              <circle cx="45" cy="22" r="9" />
              <rect x="14" y="22" width="38" height="10" rx="5" />
            </svg>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(181,193,207,0.05)_0%,rgba(80,95,112,0.18)_100%)]" />
          </>
        )}
        {state === 'storm' && (
          <>
            <svg viewBox="0 0 64 40" className="absolute top-3 right-3 h-8 w-12 text-[#8D98A6]" fill="currentColor" aria-hidden="true">
              <circle cx="20" cy="20" r="12" />
              <circle cx="35" cy="17" r="10" />
              <circle cx="45" cy="22" r="9" />
              <rect x="14" y="22" width="38" height="10" rx="5" />
            </svg>
            <div className="absolute inset-0 safety-rain-lines" />
            <svg viewBox="0 0 24 24" className="absolute top-10 right-8 h-5 w-5 text-[#FFE177]" fill="currentColor" aria-hidden="true">
              <path d="M13 2L5 13h5l-1 9 8-11h-5z" />
            </svg>
          </>
        )}

        <svg
          viewBox="0 0 120 70"
          className={`absolute bottom-3 left-6 h-14 w-24 text-[#F4B577] ${config.boatClass}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M14 44h92l-8 12c-2 3-5 5-9 5H31c-4 0-7-2-9-5L14 44z" />
          <rect x="58" y="18" width="4" height="26" rx="2" className="text-[#B67B45]" fill="currentColor" />
          <path d="M62 20l28 10H62z" className="text-[#F7D8B2]" fill="currentColor" />
        </svg>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-[#111827] dark:text-white">{config.subtitle}</p>
      </div>
    </div>
  );
}

function parseTlv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  let idx = 0;

  while (idx + 4 <= raw.length) {
    const tag = raw.slice(idx, idx + 2);
    const lengthStr = raw.slice(idx + 2, idx + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthStr)) break;
    const length = Number(lengthStr);
    if (!Number.isFinite(length) || length < 0) break;

    const valueStart = idx + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > raw.length) break;

    out[tag] = raw.slice(valueStart, valueEnd);
    idx = valueEnd;
  }

  return out;
}

function parseEmvCoPayload(raw: string): QrPayload | null {
  // EMVCo merchant-presented mode usually starts with 000201...
  const compact = raw.replace(/\s+/g, '');
  if (!/^0002\d{2}/.test(compact)) return null;

  const root = parseTlv(compact);

  let merchantId: string | undefined;
  let provider: string | undefined;

  // Merchant account info is typically in tags 26..51.
  for (let tag = 26; tag <= 51; tag++) {
    const key = String(tag).padStart(2, '0');
    const value = root[key];
    if (!value) continue;

    const nested = parseTlv(value);
    const gui = nested['00'];
    if (!provider && gui) provider = gui;

    merchantId = nested['01'] || nested['02'] || nested['03'] || nested['04'] || merchantId;

    // Some bank payloads keep account/proxy ID as a direct value instead of nested TLV.
    if (!merchantId && nested['00'] === undefined && value.length >= 6 && value.length <= 40) {
      merchantId = value;
    }

    if (merchantId) break;
  }

  const amountRaw = root['54'];
  const amount = amountRaw ? Number(amountRaw) : undefined;

  const parsed: QrPayload = {
    merchant_id: merchantId,
    account_name: root['59'] || undefined,
    amount: Number.isFinite(amount) && (amount as number) > 0 ? amount : undefined,
    currency: root['53'] === '458' ? 'MYR' : (root['53'] || 'MYR'),
    provider,
    signature: 'UNKNOWN',
  };

  if (!parsed.merchant_id && parsed.account_name) {
    const normalized = parsed.account_name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (normalized) {
      parsed.merchant_id = `M${normalized.slice(0, 18)}`;
    }
  }

  if (!parsed.merchant_id && !parsed.account_name) return null;
  return parsed;
}

function parseQrPayload(raw: string): QrPayload | null {
  const text = raw.trim();
  const compact = text.replace(/\s+/g, '');

  const emvFirst = parseEmvCoPayload(compact);
  if (emvFirst) return emvFirst;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed as QrPayload;
    }
  } catch {
    // Fallback to URL-style parsing below.
  }

  try {
    const url = new URL(text);
    const amount = Number(url.searchParams.get('amount') || 0);
    return {
      merchant_id: url.searchParams.get('merchant_id') || undefined,
      account_name: url.searchParams.get('account_name') || undefined,
      provider: url.searchParams.get('provider') || undefined,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
      currency: url.searchParams.get('currency') || undefined,
      created_at: url.searchParams.get('created_at') || undefined,
      signature: url.searchParams.get('signature') || undefined,
    };
  } catch {
    // Fallback for bank/ewallet payment QR encoded as EMVCo TLV.
    return parseEmvCoPayload(compact);
  }
}

export default function Transaction() {
  const { addEvent, updateEventStatus } = useFraudEvents();
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<'idle' | 'confirming' | 'processing' | 'approved' | 'verification' | 'blocked' | 'quiz' | 'face-id' | 'pin-entry' | 'guardianPending'>('idle');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [judgeDemoPreset, setJudgeDemoPreset] = useState<'real-auto' | 'new-device' | 'risky-ip' | 'max-risk'>('real-auto');
  const [selectedProvider, setSelectedProvider] = useState('Maybank');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [fraudResult, setFraudResult] = useState<FraudResult | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [lastQrPreview, setLastQrPreview] = useState<string>('');
  const [scannedQrPayload, setScannedQrPayload] = useState<QrPayload | null>(null);
  const [qrScanStatus, setQrScanStatus] = useState<{ tone: 'safe' | 'warn'; message: string } | null>(null);
  const [isCallConsentOpen, setIsCallConsentOpen] = useState(false);
  const [isCallConsultOpen, setIsCallConsultOpen] = useState(false);
  const [isListeningCall, setIsListeningCall] = useState(false);
  const [callRiskScore, setCallRiskScore] = useState(0.05);
  const [callVerdict, setCallVerdict] = useState('Tap Start Listening to check this call.');
  const [callSignals, setCallSignals] = useState<string[]>([]);
  const [callError, setCallError] = useState<string | null>(null);
  const [boatProfile, setBoatProfile] = useState<BoatProfile>({ safePoints: 0, damage: 0, warningStrikes: 0, locked: false });
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const callRecognitionRef = useRef<any>(null);
  const hasPlayedCallAlertRef = useRef(false);
  const scannerRegionId = 'qr-reader-shield';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOAT_PROFILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BoatProfile;
      if (typeof parsed.safePoints === 'number') {
        setBoatProfile(parsed);
      }
    } catch {
      // Ignore invalid local data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(BOAT_PROFILE_STORAGE_KEY, JSON.stringify(boatProfile));
  }, [boatProfile]);

  const continueTransactionAfterGate = () => {
    const pinEnabled = localStorage.getItem('fraud-shield-profile-v1-pin') !== 'false';
    if (pinEnabled) {
      setEnteredPin('');
      setPinError(null);
      setModalState('pin-entry');
      return;
    }
    handleProcessTransaction();
  };

  const requiresQuizGate = boatProfile.locked || boatProfile.damage >= 60 || boatProfile.warningStrikes >= 3;

  const handleQuizSubmit = () => {
    const unanswered = BOAT_QUIZ.some((question) => quizAnswers[question.id] === undefined);
    if (unanswered) {
      setQuizError('Please answer all questions before submitting.');
      return;
    }

    const score = BOAT_QUIZ.reduce((total, question) => {
      return total + (quizAnswers[question.id] === question.correctIndex ? 1 : 0);
    }, 0);

    if (score < 2) {
      setQuizError('Please review the safety tips and try again. You need at least 2 correct answers.');
      return;
    }

    setQuizError(null);
    setBoatProfile((prev) => ({
      ...prev,
      warningStrikes: 0,
      damage: Math.max(0, prev.damage - 35),
      locked: false,
    }));
    continueTransactionAfterGate();
  };

  const activeDeviceId: 'demo-web' | 'demo-new-device' =
    judgeDemoPreset === 'new-device' || judgeDemoPreset === 'max-risk' ? 'demo-new-device' : 'demo-web';
  const activeIpProfile: 'auto' | 'risky' =
    judgeDemoPreset === 'risky-ip' || judgeDemoPreset === 'max-risk' ? 'risky' : 'auto';

  const formatPercent = (score?: number) => {
    const value = typeof score === 'number' ? score : 0;
    const percent = value * 100;
    if (percent > 0 && percent < 0.1) return '<0.1%';
    return `${percent.toFixed(1)}%`;
  };

  const speakGuardianNotification = () => {
    // Use Web Speech API to notify the elderly user
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('We have notified your guardian about this high-risk payment. Your family can help protect your account. Please do not proceed.');
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakCallScamWarning = () => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance('Warning. This caller may be a scammer and is asking for your banking details.');
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const getCallRiskClass = (score: number) => {
    if (score >= 0.7) return 'bg-[#FF3B30]';
    if (score >= 0.35) return 'bg-[#FF9F0A]';
    return 'bg-[#32D74B]';
  };

  const evaluateCallRisk = (input: string) => {
    const text = input.toLowerCase();
    let risk = 0.06;
    const matched: string[] = [];

    const rules = [
      { tag: '[AUTHORITY_CLAIM]', delta: 0.22, words: ['police', 'court', 'authority', 'government', 'bank officer'] },
      { tag: '[URGENCY_CUE]', delta: 0.2, words: ['urgent', 'immediately', 'right now', 'last warning', 'act now'] },
      { tag: '[FINANCIAL_ACTION]', delta: 0.22, words: ['transfer', 'send money', 'bank in', 'payment now'] },
      { tag: '[BANKING_DETAIL_REQUEST]', delta: 0.28, words: ['otp', 'pin', 'password', 'cvv', 'banking details', 'tac'] },
      { tag: '[ISOLATION_TACTIC]', delta: 0.2, words: ['do not tell your family', 'keep this secret', 'tell no one'] },
      { tag: '[THREAT_LANGUAGE]', delta: 0.15, words: ['you are in trouble', 'account will be blocked', 'arrest', 'legal action'] },
    ];

    for (const rule of rules) {
      if (rule.words.some((word) => text.includes(word))) {
        risk += rule.delta;
        matched.push(rule.tag);
      }
    }

    // Keep scoring pattern-focused so personal details are never required.
    risk += (Math.random() - 0.5) * 0.06;

    risk = Math.max(0, Math.min(0.99, risk));
    return { risk, matched };
  };

  const stopCallConsultation = () => {
    if (callRecognitionRef.current) {
      callRecognitionRef.current.stop();
      callRecognitionRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListeningCall(false);
  };

  const startCallConsultation = () => {
    const speechApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!speechApi) {
      setCallError('Live listening is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setCallError(null);
    setCallRiskScore(0.06);
    setCallSignals([]);
    setCallVerdict('Listening...');
    hasPlayedCallAlertRef.current = false;

    const recognition = new speechApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-MY';

    recognition.onresult = (event: any) => {
      let transcriptText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcriptText += `${event.results[i][0].transcript} `;
      }

      const cleaned = transcriptText.trim();
      const { risk, matched } = evaluateCallRisk(cleaned);
      setCallRiskScore(risk);
      setCallSignals(matched);

      if (risk >= 0.7) {
        setCallVerdict('High risk detected. End the call now.');
        if (!hasPlayedCallAlertRef.current) {
          hasPlayedCallAlertRef.current = true;
          speakCallScamWarning();
        }
      } else if (risk >= 0.35) {
        setCallVerdict('Warning signs detected. Stay careful.');
      } else {
        setCallVerdict('No strong scam signs yet.');
      }
    };

    recognition.onerror = () => {
      setCallError('Listening error occurred. You can stop and start again.');
      setIsListeningCall(false);
    };

    recognition.onend = () => {
      setIsListeningCall(false);
    };

    recognition.start();
    callRecognitionRef.current = recognition;
    setIsListeningCall(true);
  };

  useEffect(() => {
    if (!isCallConsultOpen && isListeningCall) {
      stopCallConsultation();
    }
  }, [isCallConsultOpen, isListeningCall]);

  useEffect(() => {
    return () => {
      if (callRecognitionRef.current) {
        callRecognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (modalState !== 'guardianPending') return;
    const approvalId = fraudResult?.guardian_approval_id;
    if (!approvalId) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-approval-status/${approvalId}`);
        if (!response.ok) return;
        const data = await response.json();
        const approval = data?.approval;
        if (!approval) return;

        if (approval.status === 'APPROVED') {
          setFraudResult((prev) => prev ? {
            ...prev,
            status: 'FLAGGED',
            recommendation: 'Guardian approved. Please complete your verification to continue.',
            reason_code: 'Guardian approved. User verification still required.',
          } : prev);
          setModalState('verification');
          return;
        }

        if (approval.status === 'REJECTED' || approval.status === 'EXPIRED') {
          setFraudResult((prev) => prev ? {
            ...prev,
            status: 'BLOCKED',
            reason_code: approval.status === 'EXPIRED'
              ? 'Guardian approval timed out. Transaction canceled for safety.'
              : 'Guardian rejected this transaction for safety.',
            recommendation: 'Please contact your guardian before trying again.',
          } : prev);
          setModalState('blocked');
        }
      } catch {
        // Keep polling quietly during transient network errors.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [modalState, fraudResult?.guardian_approval_id]);

  const renderQrIntegritySummary = () => {
    const qr = fraudResult?.qr_integrity;
    if (!qr) return null;

    return (
      <div className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-[#FFFFFF05] px-4 py-3 text-left">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6B7280] dark:text-[#8A8A8A]">QR Integrity Shield</p>
        <p className={`mt-1 text-sm font-semibold ${qr.is_verified_merchant ? 'text-[#32D74B]' : 'text-[#FF9F0A]'}`}>
          Merchant Verification: {qr.is_verified_merchant ? 'Verified' : 'Unverified'}
        </p>
        {qr.pattern_match_message && (
          <p className="mt-2 text-xs text-slate-600 dark:text-[#C9D3DF]">
            {qr.pattern_match_message}
          </p>
        )}
        {qr.warnings.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {qr.warnings.slice(0, 2).map((warning, index) => (
              <p key={`${warning}-${index}`} className="text-xs text-[#D0D0D0]">
                • {warning}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const closeQrScanner = () => {
    setIsQrScannerOpen(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => undefined);
      scannerRef.current = null;
    }
  };

  const applyResultModal = (result: FraudResult) => {
    setFraudResult(result);
    if (result.status === 'APPROVED') setModalState('approved');
    else if (result.status === 'PENDING_GUARDIAN') setModalState('guardianPending');
    else if (result.status === 'FLAGGED') setModalState('verification');
    else setModalState('blocked');
  };

  const scanQrThreat = async (decodedText: string) => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/scan-qr-threat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_qr: decodedText,
        device_id: activeDeviceId,
        ip_profile: activeIpProfile,
        sender_account: SENIOR_ACCOUNT,
      }),
    });

    if (!response.ok) {
      throw new Error(`Threat scan failed: ${response.status}`);
    }

    const result: FraudResult = await response.json();
    
    // Voice notification if guardian should be notified
    if (result.notify_guardian) {
      speakGuardianNotification();
    }
    
    return result;
  };

  useEffect(() => {
    if (!isQrScannerOpen) return;

    setQrScanError(null);
    const scanner = new Html5QrcodeScanner(
      scannerRegionId,
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
      },
      false,
    );

    scannerRef.current = scanner;
    scanner.render(
      async (decodedText) => {
        setLastQrPreview(decodedText.slice(0, 120));
        try {
          const threatResult = await scanQrThreat(decodedText);

          const parsed = parseQrPayload(decodedText);
          if (parsed && (parsed.merchant_id || parsed.account_name)) {
            setScannedQrPayload(parsed);
            setRecipientAccount(parsed.merchant_id || parsed.account_name || '');
            setRecipientName(parsed.account_name || recipientName);
            if (typeof parsed.amount === 'number' && parsed.amount > 0) {
              setAmount(String(parsed.amount));
            }
            if (parsed.provider) {
              setSelectedProvider(parsed.provider);
            }
          } else {
            setScannedQrPayload(null);
          }

          closeQrScanner();

          if (parsed && threatResult.status === 'APPROVED') {
            setFraudResult(threatResult);
            setQrScanStatus({ tone: 'safe', message: 'QR checked. Recipient details are filled in for you.' });
          } else {
            setQrScanStatus({ tone: 'warn', message: threatResult.reason_code || 'This QR needs caution.' });
            applyResultModal(threatResult);
          }
        } catch (error) {
          console.error('QR threat scan error:', error);
          setQrScanError('Unable to scan QR risk right now. Please try again.');
        }
      },
      () => {
        // Ignore scan frame errors to avoid noisy UI.
      },
    );

    return () => {
      scanner.clear().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [isQrScannerOpen, recipientName]);

  const handleProcessTransaction = async () => {
    setModalState('processing');
    try {
      const amountValue = Number(amount || 0);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid transfer amount greater than 0.');
      }

      let response: Response;
      if (scannedQrPayload) {
        response = await fetch(`${FRAUD_API_BASE_URL}/predict-qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_account: SENIOR_ACCOUNT,
            device_id: activeDeviceId,
            ip_profile: activeIpProfile,
            qr: {
              ...scannedQrPayload,
              amount: amountValue,
              merchant_id: recipientAccount || scannedQrPayload.merchant_id,
              account_name: recipientName || scannedQrPayload.account_name,
              provider: selectedProvider,
            },
          }),
        });
      } else {
        const contextResponse = await fetch(`${FRAUD_API_BASE_URL}/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_account: SENIOR_ACCOUNT,
            recipient_account: recipientAccount,
            amount: amountValue,
            device_id: activeDeviceId,
            ip_profile: activeIpProfile,
          }),
        });

        if (!contextResponse.ok) throw new Error(`Context API error: ${contextResponse.status}`);
        const transactionData: ContextResult = await contextResponse.json();

        response = await fetch(`${FRAUD_API_BASE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...transactionData, sender_account: SENIOR_ACCOUNT }),
        });
      }

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result: FraudResult = await response.json();
      setFraudResult(result);

      if (result.notify_guardian) {
        speakGuardianNotification();
      }

      setBoatProfile((prev) => {
        if (result.status === 'APPROVED') {
          const pointsGain = 10 + (result.isVerifiedMerchant ? 6 : 0);
          const nextDamage = Math.max(0, prev.damage - 8);
          const nextStrikes = Math.max(0, prev.warningStrikes - 1);
          return {
            safePoints: prev.safePoints + pointsGain,
            damage: nextDamage,
            warningStrikes: nextStrikes,
            locked: false,
          };
        }

        const damageHit = result.status === 'BLOCKED' ? 24 : 14;
        const nextDamage = Math.min(100, prev.damage + damageHit);
        const nextStrikes = prev.warningStrikes + 1;
        const locked = nextDamage >= 60 || nextStrikes >= 3;

        return {
          ...prev,
          damage: nextDamage,
          warningStrikes: nextStrikes,
          locked,
        };
      });

      const newEventId = `txn-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      setCurrentEventId(newEventId);
      addEvent({
        id: newEventId,
        timestamp: new Date().toISOString(),
        user: 'Alex Tan',
        recipientName: recipientName || 'Recipient',
        recipientAccount: recipientAccount || 'N/A',
        amount: amountValue,
        currency: selectedCurrency,
        status: result.status === 'PENDING_GUARDIAN' ? 'FLAGGED' : result.status,
        riskScore: result.risk_score,
        modelScore: result.model_score,
        reasonCode: result.reason_code,
        recommendation: result.recommendation,
        deviceProfile: activeDeviceId,
        ipProfile: activeIpProfile,
      });
      if (result.status === 'APPROVED') setModalState('approved');
      else if (result.status === 'PENDING_GUARDIAN') setModalState('guardianPending');
      else if (result.status === 'FLAGGED') setModalState('verification');
      else setModalState('blocked');
    } catch (error) {
      console.error('Error connecting to Fraud Shield API:', error);
      setModalState('idle');
      alert('Could not connect to Fraud Shield API. Is it running on port 8000?');
    }
  };

  const verifyPinAndProcess = (pinAttempt: string) => {
    const savedPin = localStorage.getItem(PROFILE_PIN_STORAGE_KEY) ?? '';

    if (!savedPin || pinAttempt !== savedPin) {
      setPinError('Incorrect PIN. Please try again.');
      setEnteredPin('');
      return;
    }

    setPinError(null);
    handleProcessTransaction();
  };

  const handlePinInput = (digit: string) => {
    if (enteredPin.length >= 6) return;

    const nextPin = `${enteredPin}${digit}`;
    setEnteredPin(nextPin);
    setPinError(null);

    if (nextPin.length === 6) {
      setTimeout(() => verifyPinAndProcess(nextPin), 300);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      
      {/* Background Gradients (Glossy Bloom, Bottom) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.50] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.05] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1510px] relative z-10 px-[40px] py-[40px] pb-[80px] flex justify-center">
        
        {/* Form Container */}
        <div data-tour="transaction-form" className="w-full max-w-[1315px] bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl p-12 flex flex-col gap-10">
          
          {/* Title Area */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111827] dark:text-white font-['Sora'] text-4xl font-bold">Make a Secure Transaction</h1>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] text-lg">Transfer funds safely with AI-powered fraud monitoring.</p>
          </div>

          <div className="rounded-2xl border border-[#FF5500]/30 bg-[#FF5500]/10 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.18em] text-orange-700 dark:text-[#FF8A4D]">Quick Payment</span>
              <span className="text-sm text-[#111827] dark:text-white">Scan a merchant or DuitNow QR code to automatically fill in payment details.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsQrScannerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF5500] px-4 py-2.5 text-sm font-bold text-[#111827] dark:text-white hover:bg-[#E04B00] transition-colors cursor-pointer"
            >
              <ScanLine size={16} />
              Scan Any QR for Scam
            </button>
          </div>

          {qrScanStatus && (
            <div className={`rounded-xl px-4 py-3 border ${qrScanStatus.tone === 'safe' ? 'border-[#32D74B]/40 bg-[#32D74B]/10 text-[#C7FFD0]' : 'border-[#FF9F0A]/40 bg-[#FF9F0A]/10 text-[#FFD7A1]'}`}>
              <span className="text-sm font-medium">{qrScanStatus.message}</span>
            </div>
          )}

          {/* Sender Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-[#111827] dark:text-white text-lg font-semibold border-b border-black/10 dark:border-white/10 pb-4">Sender Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 p-4 rounded-xl">
                <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Sender Name</span>
                <span className="text-[#111827] dark:text-white font-semibold">Alex Tan</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 p-4 rounded-xl">
                <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Account Number</span>
                <span className="text-[#111827] dark:text-white font-mono text-sm tracking-widest text-[#FF5500]">**** **** 8899</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 p-4 rounded-xl">
                <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Available Balance</span>
                <span className="text-[#111827] dark:text-white font-semibold font-['Sora']">RM 12,450</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 p-4 rounded-xl">
                <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Wallet</span>
                <span className="text-[#111827] dark:text-white font-semibold">DemoPay Wallet</span>
              </div>
            </div>
            <SafetyBoatCard profile={boatProfile} />
          </div>

          {/* Recipient Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-[#111827] dark:text-white text-lg font-semibold border-b border-black/10 dark:border-white/10 pb-4">Recipient Information</h2>
            {scannedQrPayload && (
              <div className="flex items-center justify-between rounded-xl border border-[#FF5500]/30 bg-[#FF5500]/8 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.18em] text-orange-700 dark:text-[#FF8A4D]">QR Integrity Shield</span>
                  <span className="text-sm text-[#111827] dark:text-white">Recipient details loaded from QR.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScannedQrPayload(null);
                    setQrScanStatus(null);
                  }}
                  className="text-xs font-semibold text-orange-700 dark:text-[#FF8A4D] hover:text-[#FFAA78] cursor-pointer"
                >
                  Clear QR
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Recipient Name</label>
                <input 
                  type="text" 
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter recipient name"
                  className="bg-transparent text-[#111827] dark:text-white font-semibold outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                />
              </div>
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Account Number</label>
                <input 
                  type="text" 
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                  placeholder="Enter account number"
                  className="bg-transparent text-[#111827] dark:text-white font-mono text-sm tracking-widest text-[#FF5500] outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                />
              </div>
              <StyledDropdown
                label="Wallet Provider"
                value={selectedProvider}
                onChange={setSelectedProvider}
                groups={[
                  {
                    label: 'Banks',
                    options: MALAYSIA_BANKS.map((provider) => ({ label: provider, value: provider })),
                  },
                  {
                    label: 'E-Wallets',
                    options: MALAYSIA_EWALLETS.map((provider) => ({ label: provider, value: provider })),
                  },
                ]}
              />
            </div>
          </div>

          {/* Transaction Details */}
          <div className="flex flex-col gap-6">
            <h2 className="text-[#111827] dark:text-white text-lg font-semibold border-b border-black/10 dark:border-white/10 pb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Amount</label>
                <input 
                  type="text" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-[#111827] dark:text-white font-bold font-['Sora'] text-2xl outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                />
              </div>
              <StyledDropdown
                label="Currency"
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                groups={[
                  {
                    options: ['MYR', 'USD', 'EUR', 'SGD'].map((currency) => ({ label: currency, value: currency })),
                  },
                ]}
              />
              <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Note (Optional)</label>
                <input 
                  type="text" 
                  defaultValue="" 
                  placeholder="Enter transfer note"
                  className="bg-transparent text-[#111827] dark:text-white font-semibold italic opacity-80 outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-[#5DA8FF44] bg-blue-50 dark:bg-[#5DA8FF12] px-4 py-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-[#D4E9FF]">Context Detection is Automatic</p>
              <p className="mt-1 text-xs text-blue-800 dark:text-[#B7D7FA]">Device fingerprint and IP reputation are auto-detected by the backend, just like real production flow.</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-blue-700 dark:text-[#89BDEB]">Judge Demo Preset</span>
                {[
                  { key: 'real-auto', label: 'Real Auto' },
                  { key: 'new-device', label: 'New Device' },
                  { key: 'risky-ip', label: 'Risky IP' },
                  { key: 'max-risk', label: 'Max Risk' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setJudgeDemoPreset(preset.key as 'real-auto' | 'new-device' | 'risky-ip' | 'max-risk')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${judgeDemoPreset === preset.key ? 'bg-blue-500 dark:bg-[#5DA8FF] text-white dark:text-[#0F1722]' : 'bg-black/5 dark:bg-[#FFFFFF10] text-blue-800 dark:text-[#D2E6FA] hover:bg-black/10 dark:hover:bg-black/5 dark:bg-[#FFFFFF1A]'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Security Indicator */}
          <div className="flex items-center gap-4 bg-[#FFFFFF05] border border-white/10 p-5 rounded-xl">
            <ShieldCheck size={28} className="text-[#32D74B]" />
            <div className="flex flex-col">
              <span className="text-white font-bold">Privacy-First AI Monitor</span>
              <span className="text-[#8A8A8A] text-sm">Device, IP, & behavioral data encrypt-assessed for real-time risk scoring.</span>
            </div>
          </div>

          {/* Button */}
          <button 
            data-tour="transaction-submit"
            onClick={() => {
              setModalState('confirming');
            }}
            className="w-full bg-[#FF5500] hover:bg-[#E04B00] transition-colors py-5 rounded-xl text-[#111827] dark:text-white font-['Sora'] font-bold text-lg mt-4 cursor-pointer"
          >
            Transfer Now
          </button>
        </div>
      </div>

      {isQrScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[560px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-[0_0_40px_rgba(255,85,0,0.18)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5500]/15 flex items-center justify-center">
                  <ScanLine size={20} className="text-orange-700 dark:text-[#FF8A4D]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[#111827] dark:text-white text-lg font-bold font-['Sora']">Scan Payment QR</h3>
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Align the QR code within the frame to pay.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQrScanner}
                className="w-9 h-9 rounded-lg border border-black/10 dark:border-white/10 text-[#6B7280] dark:text-[#8A8A8A] hover:text-[#111827] dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#101010] p-3">
              <div id={scannerRegionId} className="min-h-[280px] rounded-xl overflow-hidden" />
            </div>

            {qrScanError && (
              <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FFB4AF]">
                {qrScanError}
                {lastQrPreview && (
                  <p className="mt-2 text-xs text-[#FFC9C5] break-all">Decoded preview: {lastQrPreview}</p>
                )}
              </div>
            )}

            <p className="text-xs text-[#8A8A8A]">
              Scan anything: bank payment QR, e-wallet QR, or suspicious links. The shield will risk-check the decoded content.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsCallConsentOpen(true)}
        aria-label="Open call scam check"
        className="group fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-start gap-2 overflow-hidden rounded-full border border-[#5DA8FF66] bg-[#0D1624] px-3 text-sm font-semibold text-[#CFE7FF] shadow-[0_0_20px_rgba(93,168,255,0.25)] transition-all duration-300 hover:w-[265px] hover:bg-[#13233A] focus-visible:w-[265px]"
      >
        <PhoneCall size={16} className="shrink-0" />
        <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Is this call a scam? Tap to listen.
        </span>
      </button>

      {isCallConsentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[560px] rounded-3xl border border-[#5DA8FF40] bg-[#121A28] p-6 md:p-8 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[#5DA8FF1A] flex items-center justify-center">
                  <Lock size={19} className="text-[#8FC7FF]" />
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold font-['Sora']">Before We Start</h3>
                  <p className="text-xs text-[#A9C1DA]">Your privacy comes first.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCallConsentOpen(false)}
                className="h-9 w-9 rounded-lg border border-white/15 text-[#8A8A8A] hover:text-white"
              >
                <X size={17} className="mx-auto" />
              </button>
            </div>

            <div className="rounded-xl border border-[#5DA8FF40] bg-[#0D1624] p-4">
              <p className="text-sm font-semibold text-[#DDEEFF]">Call audio is not recorded.</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-semibold">
                <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">No recording saved</div>
                <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">Personal details hidden</div>
                <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">End-to-end encrypted</div>
              </div>
            </div>

            <p className="text-xs text-[#A7BDD3]">Do you consent to start live scam-check listening for this call?</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsCallConsentOpen(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCallConsentOpen(false);
                  setIsCallConsultOpen(true);
                }}
                className="flex-1 rounded-lg bg-[#5DA8FF] px-4 py-2.5 text-sm font-semibold text-[#101418] hover:bg-[#4B97EA]"
              >
                I Consent, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {isCallConsultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[760px] rounded-3xl border border-[#5DA8FF40] bg-[#131822] p-6 md:p-8 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-xl ${isListeningCall ? 'bg-[#5DA8FF33] animate-pulse' : 'bg-[#5DA8FF1A]'} flex items-center justify-center`}>
                  <ShieldCheck size={20} className="text-[#8FC7FF]" />
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold font-['Sora']">Call Consultation</h3>
                  <p className="text-xs text-[#9CB3CB]">Privacy-first call shield with instant scam warning.</p>
                  <p className="mt-1 text-[11px] text-[#8FC7FF]">Consent given • audio not recorded</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCallConsultOpen(false)} className="h-9 w-9 rounded-lg border border-white/15 text-[#8A8A8A] hover:text-white">
                <X size={17} className="mx-auto" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0F1520] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Scam Risk Right Now</p>
                <span className="text-sm font-semibold text-[#D8E8FA]">{formatPercent(callRiskScore)}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${getCallRiskClass(callRiskScore)}`} style={{ width: `${Math.max(4, Math.round(callRiskScore * 100))}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#BDD3E9]">{callVerdict}</p>
            </div>

            <div className="rounded-xl border border-[#5DA8FF40] bg-[#0E1624] p-4">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-[#8FC7FF]" />
                <p className="text-sm font-semibold text-white">Privacy First</p>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-semibold">
                <div className="rounded-lg border border-[#5DA8FF40] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">Voice stays on your phone</div>
                <div className="rounded-lg border border-[#5DA8FF40] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">Personal details hidden</div>
                <div className="rounded-lg border border-[#5DA8FF40] bg-[#5DA8FF1A] px-3 py-2 text-[#CFE7FF]">End-to-end encrypted</div>
              </div>
            </div>

            {callSignals.length > 0 && (
              <div className="rounded-xl border border-[#FFB37A44] bg-[#FFB37A12] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#FFD5AF]">Possible Scam Signs</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {callSignals.map((signal) => (
                    <span key={signal} className="rounded-full bg-[#FFFFFF18] px-2.5 py-1 text-[11px] text-[#FFE1C4]">{signal}</span>
                  ))}
                </div>
              </div>
            )}

            {(callSignals.length > 0 || callRiskScore >= 0.35) && (
              <div className="rounded-xl border border-[#FF3B3055] bg-[#FF3B3014] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#FFB8B3]">Safety Alert</p>
                <p className="mt-2 text-sm font-semibold text-[#FFD8D4]">Warning. This caller may be a scammer and is asking for your banking details.</p>
              </div>
            )}

            {callError && <p className="text-xs text-[#FFBCB7]">{callError}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (isListeningCall ? stopCallConsultation() : startCallConsultation())}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${isListeningCall ? 'bg-[#FF3B30] text-white hover:bg-[#E6352B]' : 'bg-[#5DA8FF] text-[#101418] hover:bg-[#4B97EA]'}`}
              >
                {isListeningCall ? <MicOff size={16} /> : <Mic size={16} />}
                {isListeningCall ? 'Stop Listening' : 'Start Listening'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals Flow Container */}
      {modalState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          
          {/* 1. Confirming Modal */}
          {modalState === 'confirming' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-8 flex flex-col gap-6">
              <div className="text-[#FF5500]">
                <Play size={32} className="fill-[#FF5500] stroke-none rotate-90" />
              </div>
              <h2 className="text-[#111827] dark:text-white text-2xl font-bold font-['Sora']">Confirm Transaction</h2>
              
              <div className="bg-black/5 dark:bg-[#FFFFFF05] rounded-xl flex flex-col gap-3 p-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Pay</span>
                  <span className="text-[#111827] dark:text-white font-semibold">{selectedCurrency} {amount || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">To</span>
                  <span className="text-[#111827] dark:text-white font-semibold">{recipientName || 'Recipient'}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setModalState('idle')} className="flex-1 bg-transparent border border-black/20 dark:border-white/20 text-[#111827] dark:text-white rounded-lg py-3 font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => {
                  if (requiresQuizGate) {
                    setQuizAnswers({});
                    setQuizError(null);
                    setModalState('quiz');
                    return;
                  }
                  continueTransactionAfterGate();
                }} className="flex-1 bg-[#FF3B30] hover:bg-[#E0352B] transition-colors text-[#111827] dark:text-white rounded-lg py-3 font-semibold cursor-pointer">
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* Fraud Prevention Quiz */}
          {modalState === 'quiz' && (
            <div className="w-[540px] max-w-full bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#FF9F0A55] rounded-3xl p-8 flex flex-col gap-5">
              <h2 className="text-[#111827] dark:text-white text-2xl font-bold font-['Sora']">Fraud Prevention Quiz</h2>
              <p className="text-[#B8C1CC] text-sm">Answer this short quiz to unlock transfers safely.</p>

              <div className="flex flex-col gap-4">
                {BOAT_QUIZ.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4">
                    <p className="text-[#111827] dark:text-white text-sm font-semibold">{idx + 1}. {q.question}</p>
                    <div className="mt-3 flex flex-col gap-2">
                      {q.options.map((option, optionIdx) => (
                        <label key={`${q.id}-${optionIdx}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-[#D2D8E0]">
                          <input
                            type="radio"
                            name={q.id}
                            checked={quizAnswers[q.id] === optionIdx}
                            onChange={() => {
                              setQuizAnswers((prev) => ({ ...prev, [q.id]: optionIdx }));
                              setQuizError(null);
                            }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {quizError && <p className="text-sm text-[#FFB7B3]">{quizError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalState('idle')}
                  className="flex-1 rounded-lg border border-black/20 dark:border-white/20 py-3 text-[#111827] dark:text-white font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  className="flex-1 rounded-lg bg-[#FF9F0A] py-3 text-[#1A1A1A] font-semibold hover:bg-[#E68F09] transition-colors"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          )}

          {/* PIN Entry Modal */}
          {modalState === 'pin-entry' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-8 flex flex-col items-center gap-6">
              <h2 className="text-[#111827] dark:text-white text-2xl font-bold font-['Sora'] text-center">Wallet PIN</h2>
              <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm text-center">Enter your 6-digit PIN to authorize this transfer.</p>
              
              <div className="flex justify-center gap-4 py-4">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full transition-colors ${i < enteredPin.length ? 'bg-[#FF5500]' : 'bg-black/10 dark:bg-white/10'}`} 
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-sm text-[#FF3B30] text-center -mt-2">{pinError}</p>
              )}

              <div className="grid grid-cols-3 gap-3 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(String(num))}
                    className="h-14 rounded-2xl bg-[#F8FAFC] dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 text-[#111827] dark:text-white font-bold text-xl transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setModalState('idle');
                    setPinError(null);
                  }}
                  className="h-14 rounded-2xl bg-transparent text-[#6B7280] dark:text-[#8A8A8A] font-semibold text-sm transition-all flex items-center justify-center cursor-pointer hover:text-[#111827] dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePinInput('0')}
                  className="h-14 rounded-2xl bg-[#F8FAFC] dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 text-[#111827] dark:text-white font-bold text-xl transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                >
                  0
                </button>
                <button 
                  onClick={() => {
                    setEnteredPin((prev) => prev.slice(0, -1));
                    setPinError(null);
                  }}
                  className="h-14 rounded-2xl bg-transparent text-[#6B7280] dark:text-[#8A8A8A] hover:text-[#111827] dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          )}

          {/* 2. Processing Modal */}
          {modalState === 'processing' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl pt-12 pb-12 px-8 flex flex-col items-center gap-6">
              <Loader size={48} className="text-[#FF5500] animate-spin" />
              <h2 className="text-[#111827] dark:text-white text-xl font-bold font-['Sora'] text-center">Analyzing transaction risk...</h2>
              <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm text-center">Running real-time anomaly scoring...</p>
            </div>
          )}

          {/* 3. Approved Modal */}
          {modalState === 'approved' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#32D74B40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#32D74B20] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#32D74B]" />
              </div>
              <h2 className="text-[#111827] dark:text-white text-2xl font-bold font-['Sora'] text-center">Status: Approved</h2>
              <div className="bg-[#32D74B15] px-4 py-2 rounded-full">
                <span className="text-[#32D74B] font-semibold text-sm">Safety Level: {formatPercent(fraudResult?.risk_score)} (Safe)</span>
              </div>
              <SafetyWeatherCard riskScore={fraudResult?.risk_score ?? 0.1} />
              {renderQrIntegritySummary()}
              <p className="text-[#6B7280] dark:text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.recommendation ?? 'Transaction verified and completed successfully.'}</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#32D74B] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#2CBF41]">
                Done
              </button>
            </div>
          )}

          {/* 3.5 Guardian Approval Pending */}
          {modalState === 'guardianPending' && (
            <div className="w-[430px] bg-[#1A1A1A] border border-[#5DA8FF66] rounded-3xl p-8 flex flex-col items-center gap-5 shadow-[0_0_32px_rgba(93,168,255,0.22)]">
              <div className="w-16 h-16 rounded-full bg-[#5DA8FF22] flex items-center justify-center">
                <ShieldCheck size={30} className="text-[#8FC7FF]" />
              </div>
              <h2 className="text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">Waiting for Guardian Approval</h2>
              <div className="bg-[#5DA8FF15] px-4 py-2 rounded-full">
                <span className="text-[#9ED1FF] font-semibold text-sm">Safety Level: {formatPercent(fraudResult?.risk_score)} (Review)</span>
              </div>
              <p className="text-[#9FB7CF] text-center leading-relaxed text-[14px]">
                Identity verified. This transaction is now paused until your guardian approves or rejects it.
              </p>
              {fraudResult?.guardian_approval_id && (
                <div className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8CBCE9]">Approval Reference</p>
                  <p className="mt-1 text-sm font-semibold text-white">{fraudResult.guardian_approval_id}</p>
                  {fraudResult.guardian_approval_expires_at && (
                    <p className="mt-1 text-xs text-[#A7BDD3]">Expires: {new Date(fraudResult.guardian_approval_expires_at).toLocaleString()}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => setModalState('idle')}
                className="w-full bg-[#5DA8FF] text-[#111111] rounded-lg py-3.5 font-semibold text-[14px] cursor-pointer hover:bg-[#4B97EA]"
              >
                I Will Wait for Guardian
              </button>
            </div>
          )}

          {/* 4. Verification Required */}
          {modalState === 'verification' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#FF9F0A40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#FF9F0A20] flex items-center justify-center">
                <AlertTriangle size={32} className="text-[#FF9F0A]" />
              </div>
              <h2 className="text-[#111827] dark:text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">Status: Verification Required</h2>
              <div className="bg-[#FF9F0A15] px-4 py-2 rounded-full">
                <span className="text-[#FF9F0A] font-semibold text-sm">Safety Level: {formatPercent(fraudResult?.risk_score)} (Careful)</span>
              </div>
              <SafetyWeatherCard riskScore={fraudResult?.risk_score ?? 0.5} />
              {renderQrIntegritySummary()}
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.reason_code ?? 'Unusual activity detected. Please verify your identity to continue.'}</p>
              <button
                onClick={() => {
                  setModalState('face-id');
                }}
                className="w-full bg-[#FF9F0A] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E68F09]"
              >
                Verify Identity
              </button>
            </div>
          )}

          {/* 4.5. FaceID Prototype Modal */}
          {modalState === 'face-id' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#5DA8FF50] rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(93,168,255,0.15)]">
              <h2 className="text-[#111827] dark:text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">FaceID Verification</h2>
              <div className="text-[#6B7280] dark:text-[#8A8A8A] text-sm text-center">Please position your face within the frame.</div>
              
              <div className="relative w-48 h-48 rounded-full border-4 border-dashed border-[#5DA8FF] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#5DA8FF20] to-transparent"></div>
                <div className="absolute w-full h-[2px] bg-[#5DA8FF] opacity-80 shadow-[0_0_10px_#5DA8FF] animate-bounce"></div>
                <Smartphone size={48} className="text-[#5DA8FF] opacity-80" />
              </div>

              <div className="flex w-full gap-3 mt-4">
                <button onClick={() => {
                  if (currentEventId) updateEventStatus(currentEventId, 'BLOCKED', 'FaceID Verification Failed');
                  setFraudResult(prev => prev ? { ...prev, reason_code: `${prev.reason_code} - FaceID Verification Failed` } : null);
                  setModalState('blocked');
                }} className="flex-1 rounded-lg border border-black/20 dark:border-white/20 py-3 text-[#FF3B30] font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm cursor-pointer">
                  Simulate Unsuccessful
                </button>
                <button onClick={() => {
                  if (currentEventId) {
                    if (fraudResult?.guardian_approval_required && fraudResult?.guardian_approval_id) {
                      updateEventStatus(currentEventId, 'FLAGGED', 'FaceID Verification Passed - Awaiting Guardian Approval');
                    } else {
                      updateEventStatus(currentEventId, 'APPROVED', 'FaceID Verification Passed');
                    }
                  }
                  if (fraudResult?.guardian_approval_required && fraudResult?.guardian_approval_id) {
                    setFraudResult((prev) => prev ? {
                      ...prev,
                      status: 'PENDING_GUARDIAN',
                      recommendation: 'Identity verified. Waiting for guardian approval.',
                      reason_code: 'Identity verified. Guardian decision is now required.',
                    } : prev);
                    setModalState('guardianPending');
                    return;
                  }
                  setModalState('approved');
                }} className="flex-1 rounded-lg bg-[#5DA8FF] py-3 text-[#1A1A1A] font-semibold hover:bg-[#468FE6] transition-colors text-sm shadow-[0_0_20px_#5DA8FF50] cursor-pointer">
                  Simulate Success
                </button>
              </div>
            </div>
          )}

          {/* 5. Transaction Blocked */}
          {modalState === 'blocked' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#FF3B30] rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(255,59,48,0.25)]">
              <div className="w-16 h-16 rounded-full bg-[#FF3B3020] flex items-center justify-center">
                <ShieldAlert size={32} className="text-[#FF3B30]" />
              </div>
              <h2 className="text-[#111827] dark:text-white text-[22px] font-bold font-['Sora'] text-center">Status: Transaction Blocked</h2>
              <div className="bg-[#FF3B3015] px-4 py-2 rounded-full">
                <span className="text-[#FF3B30] font-semibold text-sm">Safety Level: {formatPercent(fraudResult?.risk_score)} (Danger)</span>
              </div>
              {fraudResult?.notify_guardian && (
                <div className="w-full bg-[#32D74B15] border border-[#32D74B40] rounded-lg px-4 py-3 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#32D74B] flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-[#0C0C0C]" />
                  </div>
                  <p className="text-xs text-[#32D74B] font-medium">Your family guardian has been notified about this alert.</p>
                </div>
              )}
              <SafetyWeatherCard riskScore={fraudResult?.risk_score ?? 0.9} />
              {renderQrIntegritySummary()}
              <p className="text-[#6B7280] dark:text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.reason_code ?? 'This transaction has been blocked due to high fraud risk.'}</p>
              <button 
                onClick={() => {
                  const subject = encodeURIComponent('Inquiry: Blocked Transaction (High Risk)');
                  const body = encodeURIComponent(`Hello Support Team,\n\nMy transaction was just blocked by the Fraud Shield and I would like to request a review. Here are the details:\n\n- Date: ${new Date().toLocaleDateString()}\n- Attempted Amount: ${selectedCurrency} ${amount || '0.00'}\n- Flagged Reason: ${fraudResult?.reason_code ?? 'High Risk Detected'}\n\nPlease advise on how I can proceed.`);
                  window.location.href = `mailto:fraud-support@securebank.com?subject=${subject}&body=${body}`;
                  setModalState('idle');
                }} 
                className="w-full bg-[#FF3B30] text-[#111827] dark:text-white rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E6352B]"
              >
                Contact Support
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
