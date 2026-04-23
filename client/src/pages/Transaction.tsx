import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Loader, CheckCircle, AlertTriangle, Play, ChevronDown, ScanLine, X, PhoneCall, Mic, MicOff, Lock, Smartphone, Send, Globe, Download } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { FRAUD_API_BASE_URL } from '@/const';
import { useFraudEvents } from '@/contexts/FraudEventsContext';
import { useLanguage } from '@/contexts/LanguageContext';

const TRUSTED_CONTACTS = [
  '+6012-111-2222',
  '+6019-888-9999',
  '+603-1234-5678',
];

const statusConfig = [
  {
    min: 0,
    max: 0.15,
    bg: '#10B981',
    text: 'Human Voice Verified. Safe to talk.',
    label: 'Safe',
    emoji: '🟢',
  },
  {
    min: 0.5,
    max: 0.75,
    bg: '#F59E0B',
    text: '⚠️ Warning: Unusual Voice Patterns. Be careful.',
    label: 'Warning',
    emoji: '🟡',
  },
  {
    min: 0.75,
    max: 1.01,
    bg: '#EF4444',
    text: '🛑 STOP: AI CLONE DETECTED. Hang up immediately!',
    label: 'AI Clone',
    emoji: '🔴',
  },
];

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

// EMV AID and provider ID mappings for Malaysian banks
const PROVIDER_ID_BANK_MAP: Record<string, string> = {
  'A0000006150001': 'RHB Bank',
  'A0000002980840': 'Maybank',
  'A0000000021010': 'CIMB Bank',
  'A0000000980840': 'Public Bank',
  'A0000007610002': 'HSBC Malaysia',
  'A0000003710002': 'UOB Malaysia',
  'A0000004401002': 'Bank Muamalat',
};

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

type AutoReportChannel = 'mcmc' | 'google-safe-browsing';

type AutoReportState = {
  status: 'idle' | 'sending' | 'sent' | 'error';
  message: string;
  externalReportId: string | null;
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

type OcrExtractionResult = {
  accountNumber?: string;
  amount?: number;
  currency?: string;
  recipientName?: string;
};

type FormStep = 'sender' | 'recipient';

type SafetyWeatherState = 'calm' | 'cloudy' | 'storm';

type AIVoiceAssessment = {
  suspected: boolean;
  score: number;
  reasons: string[];
  confidence: 'low' | 'medium' | 'high';
};

const PROFILE_PIN_STORAGE_KEY = 'fraud-shield-profile-v1-pin-value';
const SENIOR_ACCOUNT = 'ALEX8899';

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

function cleanQrRecipientName(raw?: string): string | undefined {
  if (!raw) return undefined;

  let cleaned = raw.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[^A-Za-z0-9 .,&'\-/]/g, '');

  // Some EMV payloads leak the next TLV tag suffix into merchant name (e.g. TEOJINGYING60).
  if (/^[A-Za-z]{5,}\d{2}$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -2);
  }

  return cleaned || undefined;
}

function normalizeLikelyAccountNumber(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 16) {
    return undefined;
  }
  return digits;
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
    if (!provider && gui) {
      // Map known EMV AID to bank names
      provider = PROVIDER_ID_BANK_MAP[gui] || gui;
    }

    merchantId = nested['01'] || nested['02'] || nested['03'] || nested['04'] || merchantId;

    // Some bank payloads keep account/proxy ID as a direct value instead of nested TLV.
    if (!merchantId && nested['00'] === undefined && value.length >= 6 && value.length <= 40) {
      merchantId = value;
    }

    if (merchantId) break;
  }

  const amountRaw = root['54'];
  const amount = amountRaw ? Number(amountRaw) : undefined;
  const accountName = cleanQrRecipientName(root['59'] || undefined);

  const parsed: QrPayload = {
    merchant_id: merchantId,
    account_name: accountName,
    amount: Number.isFinite(amount) && (amount as number) > 0 ? amount : undefined,
    currency: root['53'] === '458' ? 'MYR' : (root['53'] || 'MYR'),
    provider,
    signature: 'UNKNOWN',
  };

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

function normalizeDetectedCurrency(raw?: string): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'RM') return 'MYR';
  if (normalized === 'PHP') return 'PHP';
  if (normalized === '$') return 'USD';
  return normalized;
}

function parseDetectedAmount(rawAmount: string): number | undefined {
  const cleaned = rawAmount.replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function normalizeCandidateName(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\s+/g, ' ').replace(/[|]/g, ' ').trim();
  if (!cleaned) return undefined;
  if (cleaned.length < 3 || cleaned.length > 90) return undefined;
  if (/^\d+$/.test(cleaned)) return undefined;
  return cleaned;
}

function stripRecipientTailNoise(raw: string): string {
  const stopPatterns = [
    /\b(?:invoice\s*no\.?|order\s*id|date|handled\s*by|email|contact|payment\s*method|remarks|account\s*(?:no\.?|number)|swift\s*code|bank)\b/i,
    /\b\d{2,}[:\/-]\d{2,}[:\/-]\d{2,}\b/, // likely date fragments
  ];

  let candidate = raw;
  for (const pattern of stopPatterns) {
    const match = pattern.exec(candidate);
    if (match && match.index > 0) {
      candidate = candidate.slice(0, match.index).trim();
    }
  }

  return candidate.replace(/[,:;\-\s]+$/g, '').trim();
}

function detectRecipientNameFromLines(lines: string[], normalizedText: string): string | undefined {
  const accountNameRegex = /(?:account\s*name|a\/c\s*name)\s*[:\-]?\s*([A-Za-z0-9 .,&'()\/-]{3,100}?)(?=\s+(?:account\s*(?:no\.?|number)|swift\s*code|payment\s*method|remarks|invoice\s*no\.?|order\s*id|date|email|bank)\b|$)/i;
  const accountNameGlobalMatch = normalizedText.match(accountNameRegex);
  if (accountNameGlobalMatch?.[1]) {
    const candidate = normalizeCandidateName(stripRecipientTailNoise(accountNameGlobalMatch[1]));
    if (candidate) return candidate;
  }

  const rules: RegExp[] = [
    /(?:account\s*name|a\/c\s*name)\s*[:\-]?\s*(.+)$/i,
    /(?:bill\s*to|recipient|payee|beneficiary|to)\s*[:\-]?\s*(.+)$/i,
  ];

  for (const line of lines) {
    for (const rule of rules) {
      const match = line.match(rule);
      if (match?.[1]) {
        const candidate = normalizeCandidateName(stripRecipientTailNoise(match[1]));
        if (candidate) return candidate;
      }
    }
  }

  // Fallback for cases like:
  // Bill to : Universiti Malaya
  // Vaethenee Balaguru
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    if (/bill\s*to\s*[:\-]?/i.test(current)) {
      const tail = stripRecipientTailNoise(current.replace(/.*bill\s*to\s*[:\-]?\s*/i, '').trim());
      const tailName = normalizeCandidateName(tail);
      if (tailName) return tailName;

      const next = normalizeCandidateName(stripRecipientTailNoise(lines[i + 1] || ''));
      if (next) return next;
    }
  }

  return undefined;
}

function detectAccountNumberFromText(text: string): string | undefined {
  const preferred = text.match(/(?:account\s*(?:no|number|#)?|a\/c\s*(?:no|number)?)\s*[:\-\.]?\s*([0-9][0-9\s.\-]{7,24}\d)/i);
  if (preferred?.[1]) {
    const normalized = normalizeLikelyAccountNumber(preferred[1]);
    if (normalized) return normalized;
  }

  const genericCandidates = text.match(/(?:\d[\s.\-]?){10,16}\d/g) || [];
  for (const candidate of genericCandidates) {
    const normalized = normalizeLikelyAccountNumber(candidate);
    if (normalized) return normalized;
  }

  return undefined;
}

function detectAmountFromLines(lines: string[]): { amount?: number; currency?: string } {
  const keyAmountRegex = /(?:total\s*(?:payment|amount|due)|grand\s*total|amount\s*due|invoice\s*total)\s*[:\-]?\s*(?:(RM|MYR|\$|PHP)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2}))/i;
  const inlineAmountRegex = /\b(RM|MYR|\$|PHP)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2}))/i;
  const plainAmountRegex = /\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2}))\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(keyAmountRegex);
    if (keyMatch) {
      return {
        amount: parseDetectedAmount(keyMatch[2]),
        currency: normalizeDetectedCurrency(keyMatch[1] || 'RM'),
      };
    }

    if (/(?:total\s*(?:payment|amount|due)|grand\s*total|amount\s*due|invoice\s*total)/i.test(line)) {
      const nextLine = lines[i + 1] || '';
      const nextWithCurrency = nextLine.match(inlineAmountRegex);
      if (nextWithCurrency) {
        return {
          amount: parseDetectedAmount(nextWithCurrency[2]),
          currency: normalizeDetectedCurrency(nextWithCurrency[1]),
        };
      }

      const nextPlain = nextLine.match(plainAmountRegex);
      if (nextPlain) {
        return {
          amount: parseDetectedAmount(nextPlain[1]),
          currency: 'MYR',
        };
      }
    }
  }

  // Fallback: first currency amount found in text.
  for (const line of lines) {
    const inline = line.match(inlineAmountRegex);
    if (inline) {
      return {
        amount: parseDetectedAmount(inline[2]),
        currency: normalizeDetectedCurrency(inline[1]),
      };
    }
  }

  return {};
}

function extractFinancialDataFromText(text: string): OcrExtractionResult {
  const normalized = text.replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const recipientName = detectRecipientNameFromLines(lines, normalized);
  const accountNumber = detectAccountNumberFromText(normalized);
  const amountInfo = detectAmountFromLines(lines);

  return {
    accountNumber,
    amount: amountInfo.amount,
    currency: amountInfo.currency,
    recipientName,
  };
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const textChunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    const page = await pdfDoc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    if (pageText.trim()) {
      textChunks.push(pageText);
    }
  }

  return textChunks.join('\n');
}

async function renderFirstPdfPageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const firstPage = await pdfDoc.getPage(1);
  const viewport = firstPage.getViewport({ scale: 2.1 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context is unavailable for PDF rendering.');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await firstPage.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas;
}

async function preprocessImageForOcr(file: File): Promise<HTMLCanvasElement> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load selected image.'));
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable.');
    }

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Preprocess for OCR: grayscale -> boost contrast -> threshold to black/white.
    const contrast = 1.85;
    const threshold = 150;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
      const contrastGray = Math.max(0, Math.min(255, ((gray - 128) * contrast) + 128));
      const binary = contrastGray >= threshold ? 255 : 0;

      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }

    context.putImageData(imageData, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

// Trusted contacts for mock call simulation
const trusted_contacts = [
  '+60123456789', // Example trusted number
  '+60111222333',
];

// Simulate incoming call event (for demo)
function useMockIncomingCall({ onUnknownCall }: { onUnknownCall: (number: string) => void }) {
  useEffect(() => {
    // Simulate a call after 7 seconds (for demo)
    const timer = setTimeout(() => {
      const incomingNumber = '+60199887766'; // Not in trusted_contacts
      if (!trusted_contacts.includes(incomingNumber)) {
        onUnknownCall(incomingNumber);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [onUnknownCall]);
}

export default function Transaction() {
  const { addEvent, updateEventStatus } = useFraudEvents();
  const { t } = useLanguage();
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<'idle' | 'confirming' | 'processing' | 'approved' | 'verification' | 'blocked' | 'face-id' | 'pin-entry' | 'guardianPending'>('idle');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [judgeDemoPreset, setJudgeDemoPreset] = useState<'real-auto' | 'new-device' | 'risky-ip' | 'max-risk'>('real-auto');
  const [selectedProvider, setSelectedProvider] = useState('Maybank');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientValidation, setRecipientValidation] = useState<{
    status: string;
    risk_score: number;
    warnings: string[];
    recipient_name_valid: boolean;
    account_number_valid: boolean;
    account_number_checked?: boolean;
  } | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);
  const [fraudResult, setFraudResult] = useState<FraudResult | null>(null);
  const [isQrActionPickerOpen, setIsQrActionPickerOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [lastQrPreview, setLastQrPreview] = useState<string>('');
  const [isQrImageDecoding, setIsQrImageDecoding] = useState(false);
  const [scannedQrPayload, setScannedQrPayload] = useState<QrPayload | null>(null);
  const [qrScanStatus, setQrScanStatus] = useState<{ tone: 'safe' | 'warn' | 'danger'; message: string } | null>(null);
  const [activeStep, setActiveStep] = useState<FormStep>('recipient');
  const [recipientVerification, setRecipientVerification] = useState<{ label: string } | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<string | null>(null);
  const [autoReportState, setAutoReportState] = useState<AutoReportState>({
    status: 'idle',
    message: '',
    externalReportId: null,
  });

  const generateExternalReportId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const token = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `EMR-${token}`;
  };

  const markBlockedScamForAdminDemo = () => {
    const currentRaw = localStorage.getItem('scamsBlocked');
    const currentVal = Number(currentRaw ?? '10');
    const safeCurrent = Number.isFinite(currentVal) && currentVal >= 0 ? currentVal : 10;

    // Avoid double increments when user re-clicks for the same blocked incident.
    if (currentEventId) {
      const lastEventId = localStorage.getItem('scamsBlockedLastEventId');
      if (lastEventId === currentEventId) {
        setModalState('idle');
        return;
      }
      localStorage.setItem('scamsBlockedLastEventId', currentEventId);
    }

    localStorage.setItem('scamsBlocked', String(safeCurrent + 1));
    setModalState('idle');
  };

  const [isCallConsentOpen, setIsCallConsentOpen] = useState(false);
  const [isCallConsultOpen, setIsCallConsultOpen] = useState(false);
  const [isListeningCall, setIsListeningCall] = useState(false);
  const [callRiskScore, setCallRiskScore] = useState(0.05);
  const [callVerdict, setCallVerdict] = useState('Tap Start Listening to check this call.');
  const [callSignals, setCallSignals] = useState<string[]>([]);
  const [aiVoiceAssessment, setAiVoiceAssessment] = useState<AIVoiceAssessment>({
    suspected: false,
    score: 0,
    reasons: [],
    confidence: 'low',
  });
  const [callBackendVoiceAssessment, setCallBackendVoiceAssessment] = useState<AIVoiceAssessment | null>(null);
  const [callVoiceAuditMessage, setCallVoiceAuditMessage] = useState<string>('');
  const [callError, setCallError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const callRecognitionRef = useRef<any>(null);
  const hasPlayedCallAlertRef = useRef(false);
  const callAudioContextRef = useRef<AudioContext | null>(null);
  const callAnalyserRef = useRef<AnalyserNode | null>(null);
  const callAudioRafRef = useRef<number | null>(null);
  const callMediaStreamRef = useRef<MediaStream | null>(null);
  const callEnergyHistoryRef = useRef<number[]>([]);
  const callCentroidHistoryRef = useRef<number[]>([]);
  const callHighBandRatiosRef = useRef<number[]>([]);
  const callFlatnessHistoryRef = useRef<number[]>([]);
  const callLastAnalysisTsRef = useRef(0);
  const callBackendVoiceAssessmentRef = useRef<AIVoiceAssessment | null>(null);
  const callVoiceAuditSessionRef = useRef(0);
  const unifiedInputRef = useRef<HTMLInputElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRegionId = 'qr-reader-shield';

  useEffect(() => {
    const handleIncomingCall = (event: Event) => {
      const customEvent = event as CustomEvent<{ number?: string }>;
      const incomingNumber = customEvent.detail?.number ?? '';
      if (!incomingNumber || TRUSTED_CONTACTS.includes(incomingNumber)) {
        return;
      }

      setIsCallConsentOpen(false);
      setIsCallConsultOpen(true);
      setIsListeningCall(true);
      setCallError(null);
    };

    window.addEventListener('incoming-call', handleIncomingCall as EventListener);
    return () => {
      window.removeEventListener('incoming-call', handleIncomingCall as EventListener);
    };
  }, []);

  useEffect(() => {
    callBackendVoiceAssessmentRef.current = callBackendVoiceAssessment;
  }, [callBackendVoiceAssessment]);

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

  const validateRecipient = async (name: string, account: string) => {
    if (!name.trim()) {
      setRecipientValidation(null);
      return;
    }

    setIsValidatingRecipient(true);
    try {
      const response = await fetch(`${FRAUD_API_BASE_URL}/validate-recipient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: name,
          account_number: account,
          sender_account: SENIOR_ACCOUNT,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecipientValidation(data);
      }
    } catch (error) {
      console.error('Recipient validation error:', error);
    } finally {
      setIsValidatingRecipient(false);
    }
  };

  useEffect(() => {
    const validationTimer = setTimeout(() => {
      if (recipientName.trim()) {
        validateRecipient(recipientName, recipientAccount);
      }
    }, 800);

    return () => clearTimeout(validationTimer);
  }, [recipientName, recipientAccount]);

  const buildAutoReportPayload = (channel: AutoReportChannel) => {
    const riskScore = fraudResult?.risk_score ?? 0;
    const modelScore = fraudResult?.model_score ?? null;
    const amountValue = Number(amount || 0);
    const qrPreview = scannedQrPayload ? JSON.stringify(scannedQrPayload).slice(0, 180) : (lastQrPreview || null);

    return {
      report_channel: channel,
      sender_account: SENIOR_ACCOUNT,
      recipient_name: recipientName || fraudResult?.qr_integrity?.account_name || 'Unknown Recipient',
      recipient_account: recipientAccount || fraudResult?.qr_integrity?.merchant_id || 'N/A',
      amount: Number.isFinite(amountValue) ? amountValue : 0,
      currency: selectedCurrency,
      risk_score: riskScore,
      model_score: modelScore,
      reason_code: fraudResult?.reason_code ?? 'High risk scam detected by Fraud Shield.',
      recommendation: fraudResult?.recommendation ?? 'Block the transfer and review the payment path.',
      transaction_status: fraudResult?.status ?? 'BLOCKED',
      device_id: activeDeviceId,
      ip_profile: activeIpProfile,
      qr_preview: qrPreview,
      evidence: [
        fraudResult?.reason_code,
        fraudResult?.recommendation,
        fraudResult?.qr_integrity?.pattern_match_message,
        fraudResult?.qr_integrity?.warnings?.[0],
      ].filter(Boolean) as string[],
    };
  };

  const submitAutoReport = async () => {
    if (!fraudResult) return;

    const externalReportId = generateExternalReportId();

    setAutoReportState({
      status: 'sending',
      message: 'Submitting report to MCMC and Google Safe Browsing...',
      externalReportId,
    });

    const mcmcPayload = buildAutoReportPayload('mcmc');
    const googlePayload = buildAutoReportPayload('google-safe-browsing');
    localStorage.setItem('fraud-shield-auto-report-draft-v1', JSON.stringify({
      mcmc: mcmcPayload,
      googleSafeBrowsing: googlePayload,
      saved_at: new Date().toISOString(),
    }));

    try {
      const [mcmcResult, googleResult] = await Promise.allSettled([
        fetch(`${FRAUD_API_BASE_URL}/api/v1/reports/mcmc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcmcPayload),
        }),
        fetch(`${FRAUD_API_BASE_URL}/api/v1/reports/google-safe-browsing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googlePayload),
        }),
      ]);

      const mcmcOk = mcmcResult.status === 'fulfilled' && mcmcResult.value.ok;
      const googleOk = googleResult.status === 'fulfilled' && googleResult.value.ok;

      if (mcmcOk) {
        await mcmcResult.value.json();
      }
      if (googleOk) {
        await googleResult.value.json();
      }

      const finalStatus = mcmcOk && googleOk ? 'sent' : 'error';
      const finalMessage = mcmcOk && googleOk
        ? 'Fraud report submitted to both MCMC and Google Safe Browsing.'
        : 'Partial submission: one or more channels failed. Draft is saved locally for retry.';

      setAutoReportState({
        status: finalStatus,
        message: finalMessage,
        externalReportId,
      });
    } catch {
      setAutoReportState({
        status: 'error',
        message: 'Saved a local fraud report draft. You can retry once the backend is available.',
        externalReportId,
      });
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

  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

  const stdDev = (values: number[]) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const mergeVoiceAssessments = (
    browserAssessment: AIVoiceAssessment,
    serverAssessment: AIVoiceAssessment | null,
  ): AIVoiceAssessment => {
    if (!serverAssessment) {
      return browserAssessment;
    }

    const score = clamp01((browserAssessment.score * 0.55) + (serverAssessment.score * 0.45));
    const reasons = Array.from(new Set([
      ...browserAssessment.reasons,
      ...serverAssessment.reasons,
    ])).slice(0, 5);
    const suspected = browserAssessment.suspected || serverAssessment.suspected || score >= 0.45;
    const confidence: 'low' | 'medium' | 'high' = score >= 0.72 ? 'high' : score >= 0.45 ? 'medium' : 'low';

    return {
      suspected,
      score,
      reasons,
      confidence,
    };
  };

  const encodeWavBlob = (samples: Float32Array[], sampleRate: number) => {
    const sampleCount = samples.reduce((total, chunk) => total + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    let offset = 0;
    let position = 0;
    const writeUint16 = (value: number) => {
      view.setUint16(offset, value, true);
      offset += 2;
    };
    const writeUint32 = (value: number) => {
      view.setUint32(offset, value, true);
      offset += 4;
    };

    writeString(offset, 'RIFF');
    offset += 4;
    writeUint32(36 + sampleCount * 2);
    writeString(offset, 'WAVE');
    offset += 4;
    writeString(offset, 'fmt ');
    offset += 4;
    writeUint32(16);
    writeUint16(1);
    writeUint16(1);
    writeUint32(sampleRate);
    writeUint32(sampleRate * 2);
    writeUint16(2);
    writeUint16(16);
    writeString(offset, 'data');
    offset += 4;
    writeUint32(sampleCount * 2);

    for (const chunk of samples) {
      for (let i = 0; i < chunk.length; i += 1) {
        const clipped = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(44 + (position * 2), clipped < 0 ? clipped * 0x8000 : clipped * 0x7FFF, true);
        position += 1;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const recordCallSample = async (stream: MediaStream, durationMs = 4500): Promise<Blob | null> => {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }

    const context = new AudioCtx();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const collected: Float32Array[] = [];

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      collected.push(new Float32Array(input));
      event.outputBuffer.getChannelData(0).fill(0);
    };

    source.connect(processor);
    processor.connect(context.destination);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs);
    });

    source.disconnect();
    processor.disconnect();
    await context.close();

    if (!collected.length) {
      return null;
    }

    return encodeWavBlob(collected, context.sampleRate);
  };

  const sampleAndScoreCallAudio = async (stream: MediaStream, sessionId: number) => {
    try {
      setCallVoiceAuditMessage('Running server-side librosa analysis on a short call sample...');
      const wavBlob = await recordCallSample(stream);
      if (!wavBlob || callVoiceAuditSessionRef.current !== sessionId) {
        return;
      }

      const formData = new FormData();
      formData.append('audio_file', wavBlob, 'call-sample.wav');

      const response = await fetch(`${FRAUD_API_BASE_URL}/voice-authenticity`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Voice authenticity check failed.');
      }

      const result = await response.json();
      const backendAssessment: AIVoiceAssessment = {
        suspected: Boolean(result.suspected),
        score: typeof result.score === 'number' ? result.score : 0,
        reasons: Array.isArray(result.reasons) ? result.reasons : [],
        confidence: result.confidence === 'high' || result.confidence === 'medium' ? result.confidence : 'low',
      };

      if (callVoiceAuditSessionRef.current !== sessionId) {
        return;
      }

      callBackendVoiceAssessmentRef.current = backendAssessment;
      setCallBackendVoiceAssessment(backendAssessment);
      setCallVoiceAuditMessage('Server-side voice analysis completed.');
      const browserAssessment = evaluateAIVoiceSuspicion();
      setAiVoiceAssessment(mergeVoiceAssessments(browserAssessment, backendAssessment));
    } catch {
      if (callVoiceAuditSessionRef.current === sessionId) {
        setCallVoiceAuditMessage('Server voice analysis unavailable. Using local heuristics only.');
      }
    }
  };

  const resetCallAudioHeuristics = () => {
    callEnergyHistoryRef.current = [];
    callCentroidHistoryRef.current = [];
    callHighBandRatiosRef.current = [];
    callFlatnessHistoryRef.current = [];
    callLastAnalysisTsRef.current = 0;
    callBackendVoiceAssessmentRef.current = null;
    setCallBackendVoiceAssessment(null);
    setCallVoiceAuditMessage('');
  };

  const stopCallAudioSampling = () => {
    if (callAudioRafRef.current !== null) {
      cancelAnimationFrame(callAudioRafRef.current);
      callAudioRafRef.current = null;
    }

    if (callMediaStreamRef.current) {
      callMediaStreamRef.current.getTracks().forEach((track) => track.stop());
      callMediaStreamRef.current = null;
    }

    if (callAudioContextRef.current) {
      void callAudioContextRef.current.close();
      callAudioContextRef.current = null;
    }

    callAnalyserRef.current = null;
    resetCallAudioHeuristics();
  };

  const startCallAudioSampling = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setCallError('Audio analysis is not supported in this browser.');
        return null;
      }

      const context = new AudioCtx();
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      callAudioContextRef.current = context;
      callAnalyserRef.current = analyser;
      callMediaStreamRef.current = stream;

      const run = (ts: number) => {
        const activeAnalyser = callAnalyserRef.current;
        const activeContext = callAudioContextRef.current;
        if (!activeAnalyser || !activeContext) return;

        if (ts - callLastAnalysisTsRef.current < 120) {
          callAudioRafRef.current = requestAnimationFrame(run);
          return;
        }
        callLastAnalysisTsRef.current = ts;

        const freq = new Uint8Array(activeAnalyser.frequencyBinCount);
        const time = new Float32Array(activeAnalyser.fftSize);
        activeAnalyser.getByteFrequencyData(freq);
        activeAnalyser.getFloatTimeDomainData(time);

        const nyquist = activeContext.sampleRate / 2;
        const highBandStartHz = 3400;
        const highBandStartIdx = Math.floor((highBandStartHz / nyquist) * freq.length);

        let totalEnergy = 0;
        let highBandEnergy = 0;
        let centroidNumerator = 0;
        let centroidDenominator = 0;
        const flatnessValues: number[] = [];

        for (let i = 0; i < freq.length; i += 1) {
          const magnitude = freq[i] / 255;
          totalEnergy += magnitude;
          centroidNumerator += i * magnitude;
          centroidDenominator += magnitude;

          if (i >= highBandStartIdx) {
            highBandEnergy += magnitude;
            flatnessValues.push(Math.max(1e-6, magnitude));
          }
        }

        const highBandRatio = totalEnergy > 0 ? highBandEnergy / totalEnergy : 0;
        const centroid = centroidDenominator > 0 ? centroidNumerator / centroidDenominator : 0;
        const rms = Math.sqrt(time.reduce((sum, value) => sum + (value * value), 0) / time.length);

        const geoMean = Math.exp(flatnessValues.reduce((sum, value) => sum + Math.log(value), 0) / Math.max(1, flatnessValues.length));
        const arithMean = flatnessValues.reduce((sum, value) => sum + value, 0) / Math.max(1, flatnessValues.length);
        const highBandFlatness = arithMean > 0 ? geoMean / arithMean : 0;

        const cap = <T,>(arr: T[], value: T, max = 160) => {
          arr.push(value);
          if (arr.length > max) arr.shift();
        };

        cap(callHighBandRatiosRef.current, highBandRatio);
        cap(callCentroidHistoryRef.current, centroid);
        cap(callEnergyHistoryRef.current, rms);
        cap(callFlatnessHistoryRef.current, highBandFlatness);

        callAudioRafRef.current = requestAnimationFrame(run);
      };

      callAudioRafRef.current = requestAnimationFrame(run);
      return stream;
    } catch {
      setCallError('Microphone access is needed for AI-voice suspicion checks.');
      return null;
    }
  };

  const evaluateAIVoiceSuspicion = (): AIVoiceAssessment => {
    const highRatios = callHighBandRatiosRef.current;
    const centroidHistory = callCentroidHistoryRef.current;
    const energyHistory = callEnergyHistoryRef.current;
    const flatnessHistory = callFlatnessHistoryRef.current;

    const sampleCount = Math.min(highRatios.length, centroidHistory.length, energyHistory.length, flatnessHistory.length);
    if (sampleCount < 12) {
      return {
        suspected: false,
        score: 0,
        reasons: [],
        confidence: 'low',
      };
    }

    const avgHighRatio = highRatios.reduce((sum, value) => sum + value, 0) / highRatios.length;
    const avgFlatness = flatnessHistory.reduce((sum, value) => sum + value, 0) / flatnessHistory.length;
    const centroidVariance = stdDev(centroidHistory);
    const energyVariance = stdDev(energyHistory);

    const reasons: string[] = [];
    let score = 0;

    if (avgHighRatio > 0.42) {
      score += 0.24;
      reasons.push('High-frequency spectral artifacts detected.');
    }

    if (avgFlatness > 0.58) {
      score += 0.22;
      reasons.push('Upper-band texture appears overly synthetic.');
    }

    if (centroidVariance < 32) {
      score += 0.2;
      reasons.push('Pitch contour is unusually stable for natural speech prosody.');
    }

    if (energyVariance < 0.012) {
      score += 0.18;
      reasons.push('Rhythm/energy variation is too uniform for spontaneous human speech.');
    }

    score = clamp01(score);
    const suspected = score >= 0.45;
    const confidence: 'low' | 'medium' | 'high' = score >= 0.72 ? 'high' : score >= 0.45 ? 'medium' : 'low';

    return {
      suspected,
      score,
      reasons,
      confidence,
    };
  };

  const stopCallConsultation = () => {
    callVoiceAuditSessionRef.current += 1;
    if (callRecognitionRef.current) {
      callRecognitionRef.current.stop();
      callRecognitionRef.current = null;
    }
    stopCallAudioSampling();
    setCallBackendVoiceAssessment(null);
    setCallVoiceAuditMessage('');
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
    setAiVoiceAssessment({
      suspected: false,
      score: 0,
      reasons: [],
      confidence: 'low',
    });
    setCallBackendVoiceAssessment(null);
    setCallVoiceAuditMessage('');
    resetCallAudioHeuristics();
    hasPlayedCallAlertRef.current = false;
    callVoiceAuditSessionRef.current += 1;
    const sessionId = callVoiceAuditSessionRef.current;

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
      const aiAssessment = mergeVoiceAssessments(evaluateAIVoiceSuspicion(), callBackendVoiceAssessmentRef.current);
      setAiVoiceAssessment(aiAssessment);

      const combinedRisk = clamp01(
        risk + (aiAssessment.suspected ? Math.max(0.18, aiAssessment.score * 0.36) : aiAssessment.score * 0.14),
      );

      const mergedSignals = Array.from(new Set([
        ...matched,
        ...(aiAssessment.suspected ? ['[AI_VOICE_SUSPECTED]'] : []),
      ]));

      setCallRiskScore(combinedRisk);
      setCallSignals(mergedSignals);

      if (combinedRisk >= 0.7 || aiAssessment.suspected) {
        setCallVerdict(aiAssessment.suspected
          ? 'High risk detected. Suspected AI-generated voice on this call.'
          : 'High risk detected. End the call now.');
        if (!hasPlayedCallAlertRef.current) {
          hasPlayedCallAlertRef.current = true;
          speakCallScamWarning();
        }
      } else if (combinedRisk >= 0.35) {
        setCallVerdict('Warning signs detected. Stay careful.');
      } else {
        setCallVerdict('No strong scam signs yet.');
      }
    };

    recognition.onerror = () => {
      setCallError('Listening error occurred. You can stop and start again.');
      stopCallAudioSampling();
      setIsListeningCall(false);
    };

    recognition.onend = () => {
      stopCallAudioSampling();
      setIsListeningCall(false);
    };

    recognition.start();
    callRecognitionRef.current = recognition;
    setIsListeningCall(true);

    void startCallAudioSampling().then((stream) => {
      if (!stream || callVoiceAuditSessionRef.current !== sessionId) {
        return;
      }

      void sampleAndScoreCallAudio(stream, sessionId);
    });
  };

  useEffect(() => {
    if (!isCallConsultOpen && isListeningCall) {
      stopCallConsultation();
    }
  }, [isCallConsultOpen, isListeningCall]);

  useEffect(() => {
    return () => {
      callVoiceAuditSessionRef.current += 1;
      if (callRecognitionRef.current) {
        callRecognitionRef.current.stop();
      }
      stopCallAudioSampling();
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

  const applyExtractedTransferData = (extracted: OcrExtractionResult) => {
    if (extracted.accountNumber) {
      setRecipientAccount(extracted.accountNumber);
    }
    if (extracted.recipientName) {
      setRecipientName(extracted.recipientName);
    }
    if (typeof extracted.amount === 'number' && extracted.amount > 0) {
      setAmount(extracted.amount.toFixed(2));
    }
    if (extracted.currency) {
      setSelectedCurrency(extracted.currency);
    }
    if (typeof extracted.amount !== 'number' || extracted.amount <= 0) {
      setActiveStep('recipient');
    }
  };

  const applyResultModal = (result: FraudResult) => {
    setFraudResult(result);
    if (result.status === 'APPROVED') setModalState('approved');
    else if (result.status === 'PENDING_GUARDIAN') setModalState('guardianPending');
    else if (result.status === 'FLAGGED') setModalState('verification');
    else setModalState('blocked');
  };

  const scanQrThreat = async (decodedText: string, extracted?: OcrExtractionResult) => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/scan-qr-threat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_qr: decodedText,
        device_id: activeDeviceId,
        ip_profile: activeIpProfile,
        sender_account: SENIOR_ACCOUNT,
        extracted_recipient_name: extracted?.recipientName,
        extracted_account_number: extracted?.accountNumber,
        extracted_amount: extracted?.amount,
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

  const handleDecodedQrText = async (decodedText: string) => {
    setLastQrPreview(decodedText.slice(0, 120));
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
  };

  const handleQrImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsQrImageDecoding(true);
    setQrScanError(null);

    try {
      const html5Qr = new Html5Qrcode(scannerRegionId);
      const decodedText = await html5Qr.scanFile(file, true);
      await handleDecodedQrText(decodedText);
    } catch (error) {
      console.error('QR image decode error:', error);
      setQrScanError('Could not read QR from this image. Try a clearer photo or use live scan.');
    } finally {
      setIsQrImageDecoding(false);
    }
  };

  useEffect(() => {
    if (!isQrScannerOpen) return;

    setQrScanError(null);
    setOcrSummary(null);
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
        try {
          const parsed = parseQrPayload(decodedText);
          let extracted: OcrExtractionResult | undefined;

          if (parsed && (parsed.merchant_id || parsed.account_name)) {
            const detectedAccount = normalizeLikelyAccountNumber(parsed.merchant_id);
            setScannedQrPayload(parsed);
            setRecipientAccount(detectedAccount || '');
            setRecipientName(parsed.account_name || recipientName);
            if (typeof parsed.amount === 'number' && parsed.amount > 0) {
              setAmount(parsed.amount.toFixed(2));
            }
            if (parsed.provider) {
              setSelectedProvider(parsed.provider);
            }
            extracted = {
              accountNumber: detectedAccount,
              recipientName: parsed.account_name,
              amount: parsed.amount,
              currency: parsed.currency,
            };
          } else {
            extracted = extractFinancialDataFromText(decodedText);
            if (extracted.accountNumber || extracted.recipientName || extracted.amount) {
              applyExtractedTransferData(extracted);
              setOcrSummary('Financial details were extracted from scanned text. Please verify before confirming.');
            }
            setScannedQrPayload(null);
          }

          const threatResult = await scanQrThreat(decodedText, extracted);

          closeQrScanner();

          const hasAutoFill = Boolean(
            extracted?.accountNumber || extracted?.recipientName || extracted?.amount,
          );
          const hasDetectedAmount = typeof extracted?.amount === 'number' && extracted.amount > 0;

          if (hasAutoFill && threatResult.status === 'APPROVED') {
            setFraudResult(threatResult);
            setRecipientVerification({ label: 'Verified' });
            if (hasDetectedAmount) {
              setQrScanStatus({ tone: 'safe', message: 'Scan complete. Account, recipient, and amount were filled for your verification.' });
              // Auto-trigger confirmation modal for immediate user verification when amount is available.
              setModalState('confirming');
            } else {
              setQrScanStatus({ tone: 'safe', message: 'Scan complete. Recipient details are filled. Please enter amount to continue.' });
              setActiveStep('recipient');
              window.setTimeout(() => amountInputRef.current?.focus(), 0);
            }
          } else if (threatResult.status === 'BLOCKED') {
            setRecipientVerification(null);
            setQrScanStatus({ tone: 'danger', message: threatResult.reason_code || 'Red alert: this payment destination appears risky.' });
            applyResultModal(threatResult);
          } else {
            setRecipientVerification(null);
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
  }, [activeDeviceId, activeIpProfile, isQrScannerOpen, recipientName]);

  const handleUnifiedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setQrScanError(null);
    setOcrSummary('Processing document for risk and details...');
    setIsOcrProcessing(true);
    let decodedText = '';
    let extractedDetails: OcrExtractionResult | undefined;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      // Step 1A: Detect QR Risk if it's a QR image
      try {
        const html5Qr = new Html5Qrcode(scannerRegionId);
        decodedText = await html5Qr.scanFile(file, true);

        // If QR decode succeeded, try to parse its specific financial fields
        const parsed = parseQrPayload(decodedText);
        if (parsed) {
          extractedDetails = {
            accountNumber: parsed.merchant_id || undefined,
            recipientName: parsed.account_name || undefined,
            amount: parsed.amount,
            currency: parsed.currency,
          };
        }
      } catch {
        console.log('Not a standard QR or unreadable as QR, falling back to OCR only.');
      }
    } else {
      // Step 1B: PDF pipeline (quotation/invoice/documents)
      try {
        setOcrSummary('Reading PDF text for recipient, account, and amount...');
        const pdfText = await extractTextFromPdf(file);
        if (pdfText.trim()) {
          decodedText = pdfText;
          extractedDetails = extractFinancialDataFromText(pdfText);
        }
      } catch (pdfErr) {
        console.error('PDF text extraction failed:', pdfErr);
      }
    }

    // Step 2: Extract Details via OCR (if not already found by QR/PDF text)
    if (!extractedDetails || (!extractedDetails.accountNumber && !extractedDetails.recipientName && !extractedDetails.amount)) {
      try {
        const processedCanvas = isPdf
          ? await renderFirstPdfPageToCanvas(file)
          : await preprocessImageForOcr(file);

        if (isPdf) {
          setOcrSummary('Running OCR on PDF page for extraction...');
        }

        const tesseract = await import('tesseract.js');
        const ocrResult = await tesseract.recognize(processedCanvas, 'eng');
        const extractedText = ocrResult.data.text || '';

        if (extractedText.trim()) {
          const ocrExtracted = extractFinancialDataFromText(extractedText);
          extractedDetails = {
            accountNumber: extractedDetails?.accountNumber || ocrExtracted.accountNumber,
            recipientName: extractedDetails?.recipientName || ocrExtracted.recipientName,
            amount: extractedDetails?.amount ?? ocrExtracted.amount,
            currency: extractedDetails?.currency || ocrExtracted.currency,
          };

          // Use OCR text as fallback if QR decode failed
          if (!decodedText) decodedText = extractedText;
        }
      } catch (ocrErr) {
        console.error('OCR failed:', ocrErr);
      }
    }

    // Step 3: Run Threat Scan and apply results
    if (decodedText || extractedDetails) {
      try {
        if (extractedDetails) {
          applyExtractedTransferData(extractedDetails);
          // Set verify status for UI
          setRecipientVerification({ label: 'Verified' });
        }
        
        const scanResult = await scanQrThreat(decodedText || 'OCR_ONLY_MODE', extractedDetails);
        setFraudResult(scanResult);
        closeQrScanner();

        const hasDetectedAmount = typeof extractedDetails?.amount === 'number' && extractedDetails.amount > 0;
        
        if (scanResult.status === 'APPROVED') {
          setRecipientVerification({ label: 'Verified' });
          if (hasDetectedAmount) {
            setQrScanStatus({ tone: 'safe', message: 'Analysis complete. Risk: LOW. Details auto-filled and ready for confirmation.' });
            setModalState('confirming');
          } else {
            setQrScanStatus({ tone: 'safe', message: 'Analysis complete. Risk: LOW. Recipient filled, please enter amount.' });
            setActiveStep('recipient');
            window.setTimeout(() => amountInputRef.current?.focus(), 0);
          }
        } else {
          setQrScanStatus({ 
            tone: scanResult.status === 'BLOCKED' ? 'danger' : 'warn', 
            message: scanResult.reason_code || 'Caution: Risk signals detected in this document.' 
          });
          applyResultModal(scanResult);
        }
      } catch (scanErr) {
        setQrScanError('Details extracted but risk analysis failed. Please verify manually.');
      }
    } else {
      setQrScanError('Could not read any QR or payment details from this image.');
    }
    
    setIsOcrProcessing(false);
    setOcrSummary(null);
  };

  const handleProcessTransaction = async () => {
    setModalState('processing');
    setAutoReportState({
      status: 'idle',
      message: '',
      externalReportId: null,
    });
    try {
      const amountValue = Number(amount || 0);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid transfer amount greater than 0.');
      }

      let response: Response;
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

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result: FraudResult = await response.json();
      setFraudResult(result);

      if (result.status !== 'APPROVED') {
        localStorage.setItem(
          'fraud-shield-auto-report-draft-v1',
          JSON.stringify({
            report_channel: 'mcmc',
            sender_account: SENIOR_ACCOUNT,
            recipient_name: recipientName || result.qr_integrity?.account_name || 'Unknown Recipient',
            recipient_account: recipientAccount || result.qr_integrity?.merchant_id || 'N/A',
            amount: amountValue,
            currency: selectedCurrency,
            risk_score: result.risk_score,
            model_score: result.model_score,
            reason_code: result.reason_code,
            recommendation: result.recommendation,
            transaction_status: result.status,
            device_id: activeDeviceId,
            ip_profile: activeIpProfile,
            qr_preview: scannedQrPayload ? JSON.stringify(scannedQrPayload).slice(0, 180) : (lastQrPreview || null),
          }),
        );
      }

      if (result.notify_guardian) {
        speakGuardianNotification();
      }

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

  const dismissReportedCase = () => {
    setAutoReportState({
      status: 'idle',
      message: '',
      externalReportId: null,
    });
    setModalState('idle');
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

          <button
            type="button"
            onClick={() => setIsQrActionPickerOpen(true)}
            className="w-full rounded-2xl bg-[#FF5500] px-6 py-6 text-left hover:bg-[#E04B00] transition-colors cursor-pointer shadow-[0_16px_40px_rgba(255,85,0,0.35)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black/20 text-white">
                  <ScanLine size={22} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#FFE5D5]">Primary Action</span>
                  <span className="text-white text-xl md:text-2xl font-extrabold font-['Sora']">Scan QR To Auto-Fill & Risk Check</span>
                </div>
              </div>
              <span className="hidden md:inline text-white/90 text-sm font-semibold">Tap to start</span>
            </div>
          </button>

          <input
            ref={unifiedInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={handleUnifiedUpload}
            className="hidden"
          />

          {qrScanStatus && (
            <div className={`rounded-2xl px-5 py-5 ${
              qrScanStatus.tone === 'safe'
                ? 'bg-[#19A75A] text-white'
                : qrScanStatus.tone === 'danger'
                  ? 'bg-[#C62828] text-white'
                  : 'bg-[#B56B00] text-white'
            }`}>
              <div className="flex items-start gap-3">
                {qrScanStatus.tone === 'safe' ? <CheckCircle size={20} className="mt-0.5" /> : qrScanStatus.tone === 'danger' ? <ShieldAlert size={20} className="mt-0.5" /> : <AlertTriangle size={20} className="mt-0.5" />}
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-extrabold tracking-[0.02em]">
                    {qrScanStatus.tone === 'safe' ? 'Recipient Verified via MCMC Database' : qrScanStatus.tone === 'danger' ? 'Scam Risk Alert' : 'Manual Verification Required'}
                  </p>
                  <p className="text-sm font-semibold">{qrScanStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#121212]/70 p-2">
            {[
              { key: 'sender' as const, title: 'Account Details' },
              { key: 'recipient' as const, title: 'Transfer' },
            ].map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeStep === step.key ? 'bg-[#FF5500] text-white' : 'bg-black/5 dark:bg-white/5 text-[#6B7280] dark:text-[#A2A2A2]'}`}
              >
                {step.title}
              </button>
            ))}
          </div>

          {activeStep === 'sender' && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111111]/70 px-5 py-5">
              <h2 className="text-[#111827] dark:text-white text-lg font-semibold mb-4">Account Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </div>
          )}

          {activeStep === 'recipient' && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#111111]/70 px-5 py-5 flex flex-col gap-5">
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
                        setRecipientVerification(null);
                      }}
                      className="text-xs font-semibold text-orange-700 dark:text-[#FF8A4D] hover:text-[#FFAA78] cursor-pointer"
                    >
                      Clear QR
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Recipient Name</label>
                      {isValidatingRecipient ? (
                        <span className="text-[10px] text-[#FF5500] font-semibold animate-pulse">Validating...</span>
                      ) : recipientValidation ? (
                        recipientValidation.recipient_name_valid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1F9D55] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            <CheckCircle size={11} />
                            Name Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF3B30] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            <ShieldAlert size={11} />
                            Name Flagged
                          </span>
                        )
                      ) : recipientName.trim() ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-[#6B7280] dark:text-[#A2A2A2]">
                          Pending PDRM Check
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={recipientName}
                      onFocus={() => setActiveStep('recipient')}
                      onChange={(e) => {
                        setRecipientName(e.target.value);
                        setRecipientVerification(null);
                        setRecipientValidation(null);
                      }}
                      placeholder="Enter recipient name"
                      className="bg-transparent text-[#111827] dark:text-white text-sm font-sans normal-case tracking-normal leading-normal outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                    />
                  </div>
                  <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Account Number</label>
                      {!recipientAccount.trim() ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-[#6B7280] dark:text-[#A2A2A2]">
                          Enter account to verify
                        </span>
                      ) : isValidatingRecipient ? (
                        <span className="text-[10px] text-[#FF5500] font-semibold animate-pulse">Validating...</span>
                      ) : recipientValidation && recipientValidation.account_number_checked ? (
                        recipientValidation.account_number_valid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1F9D55] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            <CheckCircle size={11} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF3B30] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            <ShieldAlert size={11} />
                            Flagged
                          </span>
                        )
                      ) : recipientAccount.trim() ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-[#6B7280] dark:text-[#A2A2A2]">
                          Pending PDRM Check
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={recipientAccount}
                      onFocus={() => setActiveStep('recipient')}
                      onChange={(e) => {
                        setRecipientAccount(e.target.value);
                        setRecipientVerification(null);
                        setRecipientValidation(null);
                      }}
                      placeholder="Enter account number"
                      className="bg-transparent text-[#111827] dark:text-white text-sm font-sans normal-case tracking-normal leading-normal outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
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

                {recipientValidation && recipientValidation.warnings.length > 0 && (
                  <div className={`rounded-lg border px-4 py-3 ${
                    recipientValidation.status === 'HIGH_RISK'
                      ? 'border-[#FF3B30]/40 bg-[#FF3B30]/10'
                      : 'border-[#FF9F0A]/40 bg-[#FF9F0A]/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={18} className={recipientValidation.status === 'HIGH_RISK' ? 'text-[#FF3B30]' : 'text-[#FF9F0A]'} />
                      <div className="flex flex-col gap-1">
                        <p className={`text-sm font-bold ${recipientValidation.status === 'HIGH_RISK' ? 'text-[#FF3B30]' : 'text-[#FF9F0A]'}`}>
                          {recipientValidation.status === 'HIGH_RISK' ? 'High Risk Detected' : 'Verification Warning'}
                        </p>
                        {recipientValidation.warnings.map((warning, idx) => (
                          <p key={idx} className="text-xs text-[#6B7280] dark:text-[#A2A2A2]">
                            • {warning}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                    <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Amount</label>
                    <input
                      ref={amountInputRef}
                      type="text"
                      value={amount}
                      onFocus={() => setActiveStep('recipient')}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setActiveStep('recipient');
                      }}
                      placeholder="0.00"
                      className="bg-transparent text-[#111827] dark:text-white text-sm font-sans normal-case tracking-normal leading-normal outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
                    />
                  </div>
                  <div className="flex flex-col gap-2 bg-[#F8FAFC] dark:bg-[#141414] border border-black/5 dark:border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                    <label className="text-[#6B7280] dark:text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Note (Optional)</label>
                    <input
                      type="text"
                      defaultValue=""
                      placeholder="Enter transfer note"
                      className="bg-transparent text-[#111827] dark:text-white text-sm font-sans normal-case tracking-normal leading-normal opacity-80 outline-none w-full placeholder:text-[#9CA3AF] dark:placeholder:text-[#525252]"
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
          )}
        </div>
      </div>

      {isQrActionPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[520px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-[0_0_40px_rgba(255,85,0,0.18)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5500]/15 flex items-center justify-center">
                  <ScanLine size={20} className="text-orange-700 dark:text-[#FF8A4D]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[#111827] dark:text-white text-lg font-bold font-['Sora']">Choose QR Input</h3>
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">One tap to continue with your preferred method.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrActionPickerOpen(false)}
                className="w-9 h-9 rounded-lg border border-black/10 dark:border-white/10 text-[#6B7280] dark:text-[#8A8A8A] hover:text-[#111827] dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsQrActionPickerOpen(false);
                  setIsQrScannerOpen(true);
                }}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0F0F0F] px-4 py-4 text-left hover:border-[#FF5500]/50 hover:bg-[#FF5500]/10 transition-colors cursor-pointer"
              >
                <p className="text-sm font-bold text-[#111827] dark:text-white">Use Camera Scanner</p>
                <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A2A2A2]">Live scan for banking QR and fraud checks.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsQrActionPickerOpen(false);
                  unifiedInputRef.current?.click();
                }}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0F0F0F] px-4 py-4 text-left hover:border-[#FF5500]/50 hover:bg-[#FF5500]/10 transition-colors cursor-pointer"
              >
                <p className="text-sm font-bold text-[#111827] dark:text-white">Upload File</p>
                <p className="mt-1 text-xs text-[#6B7280] dark:text-[#A2A2A2]">Select QR image, receipt photo, or quotation/invoice PDF.</p>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">Scan QR live, or upload screenshot/receipt for OCR extraction.</p>
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
              <div className="mt-3 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={isOcrProcessing || isQrImageDecoding}
                  onClick={() => unifiedInputRef.current?.click()}
                  className="w-full py-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-[#111827] dark:text-white font-bold transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                >
                  <Download size={20} className="rotate-180" />
                  {isOcrProcessing || isQrImageDecoding ? 'Risk Analysis in Progress...' : 'Upload QR or Transaction Record'}
                </button>
                <p className="text-center text-xs text-[#6B7280] dark:text-[#A0A0A0]">
                  Extracts recipient, account, and amount from images/PDF and screens scam risk in one step.
                </p>
              </div>
            </div>

            {ocrSummary && (
              <div className="rounded-xl border border-[#32D74B]/30 bg-[#32D74B]/10 px-4 py-3 text-xs text-[#C7FFD0]">
                {ocrSummary}
              </div>
            )}

            {qrScanError && (
              <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm text-[#FFB4AF]">
                {qrScanError}
                {lastQrPreview && (
                  <p className="mt-2 text-xs text-[#FFC9C5] break-all">Decoded preview: {lastQrPreview}</p>
                )}
              </div>
            )}

            <p className="text-xs text-[#8A8A8A]">
              Scan QR or upload a photo. We auto-extract account number, recipient, and amount, then run immediate scam risk checks.
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
                <div className={`h-11 w-11 rounded-xl ${isListeningCall ? 'bg-[#5DA8FF33] animate-pulse' : 'bg-[#5DA8FF1A]'} flex items-center justify-center`}>
                  <ShieldCheck size={20} className="text-[#8FC7FF]" />
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
          <div className="w-full max-w-[760px] rounded-3xl border border-[#5DA8FF40] bg-[#131822] p-6 md:p-8 flex flex-col gap-5 relative">
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

            <div className="rounded-xl border border-[#0B3D91]/35 bg-[#0B3D91]/14 p-4 flex flex-col gap-2">
              {(() => {
                const status = statusConfig.find((cfg) => callRiskScore >= cfg.min && callRiskScore < cfg.max) || statusConfig[0];
                const liveRiskPercent = Math.round(callRiskScore * 100);
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <span style={{ background: status.bg }} className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-lg font-bold">
                        {status.emoji}
                      </span>
                      <div>
                        <span className="text-white font-bold text-base">Live Scam Detection</span>
                        <span className="ml-2 text-xs text-[#D8E8FA]">Live scam-pattern scan</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-semibold" style={{ color: status.bg }}>{status.text}</div>
                    <div className="mt-2">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-200 ease-out"
                          style={{ width: `${liveRiskPercent}%`, background: status.bg }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#D8E8FA]">
                        <span>Live risk</span>
                        <span>{liveRiskPercent}%</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className={`rounded-xl border p-4 ${aiVoiceAssessment.suspected ? 'border-[#FF3B3055] bg-[#FF3B3016]' : 'border-[#32D74B55] bg-[#32D74B14]'}`}>
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${aiVoiceAssessment.suspected ? 'bg-[#FF3B3020]' : 'bg-[#32D74B20]'}`}>
                  {aiVoiceAssessment.suspected ? <AlertTriangle size={16} className="text-[#FFB9B4]" /> : <span className="text-[18px] leading-none">🟢</span>}
                </span>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-white">Voice Authenticity</p>
                  <span className={`text-xs font-bold uppercase tracking-[0.12em] ${aiVoiceAssessment.suspected ? 'text-[#FFB9B4]' : 'text-[#B9F8C6]'}`}>
                    {aiVoiceAssessment.suspected ? 'Suspected AI Voice' : 'No AI Voice Pattern'}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#C8DBEE]">
                {aiVoiceAssessment.suspected
                  ? 'This call is suspected to use synthetic or AI-generated voice characteristics.'
                  : 'No strong synthetic voice fingerprints detected yet.'}
              </p>
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

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={() => (isListeningCall ? stopCallConsultation() : startCallConsultation())}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${isListeningCall ? 'bg-[#FF3B30] text-white hover:bg-[#E6352B]' : 'bg-[#5DA8FF] text-[#101418] hover:bg-[#4B97EA]'}`}
              >
                {isListeningCall ? <MicOff size={16} /> : <Mic size={16} />}
                {isListeningCall ? 'Stop Listening' : 'Start Listening'}
              </button>
              {(callSignals.length > 0 || aiVoiceAssessment.suspected) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] text-[#101418] hover:bg-[#FFD700] ml-2"
                  onClick={() => {
                    const number = '+6012-345-6789'; // Replace with actual detected number if available
                    const score = formatPercent(callRiskScore);
                    const msg = encodeURIComponent(`Fraud Report: Scam call detected from ${number}. Risk Score: ${score}. Evidence: ${callSignals.join(', ') || 'AI voice suspicion detected.'}`);
                    window.open(`https://wa.me/60162206262?text=${msg}`);
                  }}
                >
                  Report Call
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals Flow Container */}
      {modalState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          
          {/* 1. Confirming Modal */}
          {modalState === 'confirming' && (
            <div className="relative w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-8 flex flex-col gap-6">
              <button
                type="button"
                onClick={() => setModalState('idle')}
                className="absolute top-5 right-5 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
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
                  continueTransactionAfterGate();
                }} className="flex-1 bg-[#FF3B30] hover:bg-[#E0352B] transition-colors text-[#111827] dark:text-white rounded-lg py-3 font-semibold cursor-pointer">
                  Confirm
                </button>
              </div>
            </div>
          )}



          {/* PIN Entry Modal */}
          {modalState === 'pin-entry' && (
            <div className="relative w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-8 flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={() => setModalState('idle')}
                className="absolute top-5 right-5 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
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
            <div className="relative w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl pt-12 pb-12 px-8 flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={() => setModalState('idle')}
                className="absolute top-5 right-5 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <Loader size={48} className="text-[#FF5500] animate-spin" />
              <h2 className="text-[#111827] dark:text-white text-xl font-bold font-['Sora'] text-center">Analyzing transaction risk...</h2>
              <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm text-center">Running real-time anomaly scoring...</p>
            </div>
          )}

          {/* 3. Approved Modal */}
          {modalState === 'approved' && (
            <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#32D74B40] rounded-3xl p-8 flex flex-col items-center gap-6">
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
              <h2 className="text-[#111827] dark:text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">Status: Verification Required</h2>
              <div className="bg-[#FF9F0A15] px-4 py-2 rounded-full">
                <span className="text-[#FF9F0A] font-semibold text-sm">Safety Level: {formatPercent(fraudResult?.risk_score)} (Careful)</span>
              </div>
              <SafetyWeatherCard riskScore={fraudResult?.risk_score ?? 0.5} />
              {renderQrIntegritySummary()}
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.reason_code ?? 'Unusual activity detected. Please verify your identity to continue.'}</p>
              <div className="w-full rounded-2xl border border-[#FF9F0A40] bg-[#FF9F0A10] p-5 flex flex-col gap-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#FF9F0A] font-bold">{t('tx.autoReport.title')}</p>
                <p className="text-sm text-[#CDA77A] leading-6">
                  {t('tx.autoReport.descVerify')}
                </p>
                {autoReportState.status !== 'sent' && (
                  <button
                    type="button"
                    onClick={() => void submitAutoReport()}
                    disabled={autoReportState.status === 'sending'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF5500] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#E04B00] disabled:opacity-60"
                  >
                    <Globe size={14} />
                    <Send size={14} />
                    {autoReportState.status === 'sending' ? t('tx.autoReport.submitting') : t('tx.autoReport.button')}
                  </button>
                )}
                {autoReportState.status !== 'idle' && (
                  <div className="text-sm text-[#D9E6F4] leading-7">
                    {autoReportState.status === 'sent' ? (
                      <div className="text-[#D7FFE1] space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-[#32D74B]" />
                          <p className="text-sm font-bold">{t('tx.autoReport.caseReported')}</p>
                        </div>
                        <p className="mt-2">{t('tx.autoReport.successLine1')}</p>
                        <p className="mt-2">{t('tx.autoReport.reportedTo')}</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          <li>Google Safe Browsing</li>
                          <li>MCMC Malaysia</li>
                        </ul>
                        <p className="mt-2">{t('tx.autoReport.thankYou')}</p>
                        {autoReportState.externalReportId && (
                          <p className="mt-2 font-semibold">Report ID: {autoReportState.externalReportId}</p>
                        )}
                        <button
                          type="button"
                          onClick={dismissReportedCase}
                          className="mt-3 inline-flex items-center justify-center rounded-lg border border-[#32D74B55] bg-[#32D74B18] px-3 py-2 text-xs font-semibold text-[#D7FFE1] hover:bg-[#32D74B25]"
                        >
                          {t('tx.autoReport.close')}
                        </button>
                      </div>
                    ) : (
                      <p>{autoReportState.message}</p>
                    )}
                  </div>
                )}
              </div>
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
            <div className="relative w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#5DA8FF50] rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(93,168,255,0.15)]">
              <button
                type="button"
                onClick={() => setModalState('idle')}
                className="absolute top-5 right-5 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
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
              {autoReportState.status === 'idle' ? (
                <>
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
                </>
              ) : null}

              {/* Simplified Auto-Report Pipeline */}
              <button
                type="button"
                onClick={markBlockedScamForAdminDemo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FF3B3040] bg-[#FF3B3010] px-4 py-3 text-sm font-bold text-[#FF3B30] hover:bg-[#FF3B301A] transition-colors"
              >
                Cancel Transfer
              </button>

              {autoReportState.status === 'idle' && (
                <button
                  type="button"
                  onClick={() => void submitAutoReport()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF3B30] px-4 py-3 text-sm font-bold text-white hover:bg-[#E6352B] transition-colors shadow-lg"
                >
                  <Send size={16} />
                  {t('tx.autoReport.button')}
                </button>
              )}
              {autoReportState.status === 'sending' && (
                <div className="w-full rounded-lg bg-[#FF3B3010] border border-[#FF3B3040] px-4 py-3 flex items-center justify-center gap-2">
                  <Loader size={16} className="text-[#FF3B30] animate-spin" />
                  <span className="text-sm font-semibold text-[#FF3B30]">{t('tx.autoReport.submitting')}</span>
                </div>
              )}
              {autoReportState.status === 'sent' && (
                <div className="w-full rounded-lg bg-[#32D74B15] border border-[#32D74B40] px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-[#32D74B]" />
                    <p className="text-sm font-bold text-[#32D74B]">{t('tx.autoReport.caseReported')}</p>
                  </div>
                  <p className="text-xs text-[#32D74B] mb-1">Reported to MCMC Malaysia & Google Safe Browsing</p>
                  {autoReportState.externalReportId && (
                    <p className="text-xs text-[#32D74B] opacity-80">ID: {autoReportState.externalReportId}</p>
                  )}
                  <button
                    type="button"
                    onClick={dismissReportedCase}
                    className="mt-2 w-full rounded-lg bg-[#32D74B25] hover:bg-[#32D74B35] px-3 py-2 text-xs font-semibold text-[#32D74B] transition-colors"
                  >
                    {t('tx.autoReport.close')}
                  </button>
                </div>
              )}
              {autoReportState.status === 'error' && (
                <div className="w-full rounded-lg bg-[#FF3B3010] border border-[#FF3B3040] px-4 py-3">
                  <p className="text-sm text-[#FF3B30] font-semibold">{autoReportState.message}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// Traffic Light UI for Voice Authenticity
function VoiceTrafficLightBanner({ score }: { score: number }) {
  let color = '#32D74B', bg = '#E6F9ED', text = 'No AI patterns found. Safe to talk.';
  let icon = <CheckCircle size={18} className="text-[#32D74B]" />;
  let label = 'Voice Authenticity';
  if (score >= 0.75) {
    color = '#FF3B30';
    bg = '#FF3B3012';
    text = '🛑 STOP: AI CLONE DETECTED. This is not a real person. Hang up immediately!';
    icon = <ShieldAlert size={18} className="text-[#FF3B30]" />;
  } else if (score >= 0.5) {
    color = '#FF9F0A';
    bg = '#FF9F0A18';
    text = '⚠️ Warning: Unusual Voice. This might be a computer. Be careful what you say.';
    icon = <AlertTriangle size={18} className="text-[#FF9F0A]" />;
  }
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: bg, border: `1.5px solid ${color}` }}>
        {icon}
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
          <span className="text-sm font-semibold" style={{ color }}>{text}</span>
        </div>
      </div>
    </div>
  );
}

