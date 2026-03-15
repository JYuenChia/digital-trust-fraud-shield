import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Loader, CheckCircle, AlertTriangle, Play, ChevronDown } from 'lucide-react';
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
    <div ref={dropdownRef} className={`relative flex flex-col gap-2 bg-[#141414] border transition-all p-4 rounded-xl ${isOpen ? 'border-[#FF5500] shadow-[0_0_20px_rgba(255,85,0,0.2)]' : 'border-white/5'}`}>
      <label className={`text-sm cursor-default transition-colors ${isOpen ? 'text-[#FF5500]' : 'text-[#8A8A8A]'}`}>{label}</label>
      <div className="flex items-center justify-between cursor-pointer w-full" onClick={() => setIsOpen((prev) => !prev)}>
        <span className="bg-transparent text-white font-semibold outline-none">{selectedOption?.label ?? value}</span>
        <ChevronDown size={20} className={`text-[#8A8A8A] transition-transform ${isOpen ? 'rotate-180 text-[#FF5500]' : ''}`} />
      </div>

      {isOpen && (
        <div className="hide-scrollbar absolute top-[calc(100%+8px)] left-0 w-full min-w-full max-h-72 overflow-y-auto bg-[#1A1A1A] border border-white/20 rounded-lg p-2 shadow-2xl z-50">
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
                  className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors text-sm leading-snug whitespace-normal break-words ${value === option.value ? 'bg-[#FF5500]/20 text-[#FF5500] font-semibold' : 'text-[#E0E0E0] hover:bg-white/5'}`}
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
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED';
  color: string;
  recommendation: string;
  reason_code: string;
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
  hour_of_day: number;
  is_new_recipient: boolean;
  device_trust_score: number;
  ip_risk_score: number;
};

export default function Transaction() {
  const { addEvent } = useFraudEvents();
  const [modalState, setModalState] = useState<'idle' | 'confirming' | 'processing' | 'approved' | 'verification' | 'blocked'>('idle');
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [selectedDeviceId, setSelectedDeviceId] = useState<'demo-web' | 'demo-new-device'>('demo-web');
  const [selectedIpProfile, setSelectedIpProfile] = useState<'auto' | 'clean' | 'risky'>('auto');
  const [selectedProvider, setSelectedProvider] = useState('Maybank');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [fraudResult, setFraudResult] = useState<FraudResult | null>(null);

  const getBreakdownSummary = () => {
    const breakdown = fraudResult?.score_breakdown;
    if (!breakdown) return null;

    const uplift = Math.max(0, breakdown.pre_floor_score - breakdown.raw_model_score);
    const appliedFloor = Math.max(breakdown.hard_floor, breakdown.status_floor);

    return {
      uplift,
      appliedFloor,
      adjustmentCount: breakdown.adjustments.length,
    };
  };

  const formatPercent = (score?: number) => {
    const value = typeof score === 'number' ? score : 0;
    const percent = value * 100;
    if (percent > 0 && percent < 0.1) return '<0.1%';
    return `${percent.toFixed(1)}%`;
  };

  const handleProcessTransaction = async () => {
    setModalState('processing');
    try {
      const amountValue = Number(amount || 0);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid transfer amount greater than 0.');
      }

      const contextResponse = await fetch(`${FRAUD_API_BASE_URL}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: 'ALEX8899',
          recipient_account: recipientAccount,
          amount: amountValue,
          device_id: selectedDeviceId,
          ip_profile: selectedIpProfile,
        }),
      });

      if (!contextResponse.ok) throw new Error(`Context API error: ${contextResponse.status}`);
      const transactionData: ContextResult = await contextResponse.json();

      const response = await fetch(`${FRAUD_API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result: FraudResult = await response.json();
      setFraudResult(result);
      addEvent({
        id: `txn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date().toISOString(),
        user: 'Alex Tan',
        recipientName: recipientName || 'Recipient',
        recipientAccount: recipientAccount || 'N/A',
        amount: amountValue,
        currency: selectedCurrency,
        status: result.status,
        riskScore: result.risk_score,
        modelScore: result.model_score,
        reasonCode: result.reason_code,
        recommendation: result.recommendation,
        deviceProfile: selectedDeviceId,
        ipProfile: selectedIpProfile,
      });
      if (result.status === 'APPROVED') setModalState('approved');
      else if (result.status === 'FLAGGED') setModalState('verification');
      else setModalState('blocked');
    } catch (error) {
      console.error('Error connecting to Fraud Shield API:', error);
      setModalState('idle');
      alert('Could not connect to Fraud Shield API. Is it running on port 8000?');
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      
      {/* Background Gradients (Glossy Bloom, Bottom) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.50] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.05] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1510px] relative z-10 px-[40px] py-[40px] pb-[80px] flex justify-center">
        
        {/* Form Container */}
        <div className="w-full max-w-[1315px] bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 flex flex-col gap-10">
          
          {/* Title Area */}
          <div className="flex flex-col gap-2">
            <h1 className="text-white font-['Sora'] text-4xl font-bold">Make a Secure Transaction</h1>
            <p className="text-[#8A8A8A] text-lg">Transfer funds safely with AI-powered fraud monitoring.</p>
          </div>

          {/* Sender Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Sender Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Sender Name</span>
                <span className="text-white font-semibold">Alex Tan</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Account Number</span>
                <span className="text-white font-mono text-sm tracking-widest text-[#FF5500]">**** **** 8899</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Available Balance</span>
                <span className="text-white font-semibold font-['Sora']">RM 12,450</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Wallet</span>
                <span className="text-white font-semibold">DemoPay Wallet</span>
              </div>
            </div>
          </div>

          {/* Recipient Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Recipient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Recipient Name</label>
                <input 
                  type="text" 
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter recipient name"
                  className="bg-transparent text-white font-semibold outline-none w-full placeholder:text-[#525252]"
                />
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Account Number</label>
                <input 
                  type="text" 
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                  placeholder="Enter account number"
                  className="bg-transparent text-white font-mono text-sm tracking-widest text-[#FF5500] outline-none w-full placeholder:text-[#525252]"
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
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Amount</label>
                <input 
                  type="text" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-white font-bold font-['Sora'] text-2xl outline-none w-full placeholder:text-[#525252]"
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
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 focus-within:border-[#FF5500] focus-within:shadow-[0_0_20px_rgba(255,85,0,0.2)] transition-all p-4 rounded-xl group">
                <label className="text-[#8A8A8A] text-sm cursor-text group-focus-within:text-[#FF5500] transition-colors">Transfer Note (Optional)</label>
                <input 
                  type="text" 
                  defaultValue="" 
                  placeholder="Enter transfer note"
                  className="bg-transparent text-white font-semibold italic opacity-80 outline-none w-full placeholder:text-[#525252]"
                />
              </div>
              <StyledDropdown
                label="Device Profile"
                value={selectedDeviceId}
                onChange={(value) => setSelectedDeviceId(value as 'demo-web' | 'demo-new-device')}
                groups={[
                  {
                    options: [
                      { label: 'Trusted Device', value: 'demo-web' },
                      { label: 'New Device', value: 'demo-new-device' },
                    ],
                  },
                ]}
              />
              <StyledDropdown
                label="IP Risk Profile"
                value={selectedIpProfile}
                onChange={(value) => setSelectedIpProfile(value as 'auto' | 'clean' | 'risky')}
                groups={[
                  {
                    options: [
                      { label: 'Auto Detect', value: 'auto' },
                      { label: 'Clean IP', value: 'clean' },
                      { label: 'High-Risk IP', value: 'risky' },
                    ],
                  },
                ]}
              />
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
            onClick={() => setModalState('confirming')}
            className="w-full bg-[#FF5500] hover:bg-[#E04B00] transition-colors py-5 rounded-xl text-white font-['Sora'] font-bold text-lg mt-4 cursor-pointer"
          >
            Transfer Now
          </button>
        </div>
      </div>

      {/* Modals Flow Container */}
      {modalState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          
          {/* 1. Confirming Modal */}
          {modalState === 'confirming' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-white/20 rounded-3xl p-8 flex flex-col gap-6">
              <div className="text-[#FF5500]">
                <Play size={32} className="fill-[#FF5500] stroke-none rotate-90" />
              </div>
              <h2 className="text-white text-2xl font-bold font-['Sora']">Confirm Transaction</h2>
              
              <div className="bg-[#FFFFFF05] rounded-xl flex flex-col gap-3 p-4">
                <div className="flex justify-between">
                  <span className="text-[#8A8A8A] text-sm">Pay</span>
                  <span className="text-white font-semibold">{selectedCurrency} {amount || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8A8A] text-sm">To</span>
                  <span className="text-white font-semibold">{recipientName || 'Recipient'}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setModalState('idle')} className="flex-1 bg-transparent border border-white/20 text-white rounded-lg py-3 font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleProcessTransaction} className="flex-1 bg-[#FF3B30] hover:bg-[#E0352B] transition-colors text-white rounded-lg py-3 font-semibold cursor-pointer">
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* 2. Processing Modal */}
          {modalState === 'processing' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-white/20 rounded-3xl pt-12 pb-12 px-8 flex flex-col items-center gap-6">
              <Loader size={48} className="text-[#FF5500] animate-spin" />
              <h2 className="text-white text-xl font-bold font-['Sora'] text-center">Analyzing transaction risk...</h2>
              <p className="text-[#8A8A8A] text-sm text-center">Running real-time anomaly scoring...</p>
            </div>
          )}

          {/* 3. Approved Modal */}
          {modalState === 'approved' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#32D74B40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#32D74B20] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#32D74B]" />
              </div>
              <h2 className="text-white text-2xl font-bold font-['Sora'] text-center">Status: Approved</h2>
              <div className="bg-[#32D74B15] px-4 py-2 rounded-full">
                <span className="text-[#32D74B] font-semibold text-sm">Risk Score: {formatPercent(fraudResult?.risk_score)} (Low)</span>
              </div>
              <p className="text-[#8A8A8A] text-xs text-center">Raw ML Score: {formatPercent(fraudResult?.model_score)}</p>
              {getBreakdownSummary() && (
                <p className="text-[#8A8A8A] text-xs text-center">
                  Context uplift: +{formatPercent(getBreakdownSummary()!.uplift)} | Floor: {formatPercent(getBreakdownSummary()!.appliedFloor)} | Signals: {getBreakdownSummary()!.adjustmentCount}
                </p>
              )}
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.recommendation ?? 'Transaction verified and completed successfully.'}</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#32D74B] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#2CBF41]">
                Done
              </button>
            </div>
          )}

          {/* 4. Verification Required */}
          {modalState === 'verification' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#FF9F0A40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#FF9F0A20] flex items-center justify-center">
                <AlertTriangle size={32} className="text-[#FF9F0A]" />
              </div>
              <h2 className="text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">Status: Verification Required</h2>
              <div className="bg-[#FF9F0A15] px-4 py-2 rounded-full">
                <span className="text-[#FF9F0A] font-semibold text-sm">Risk Score: {formatPercent(fraudResult?.risk_score)} (Medium)</span>
              </div>
              <p className="text-[#8A8A8A] text-xs text-center">Raw ML Score: {formatPercent(fraudResult?.model_score)}</p>
              {getBreakdownSummary() && (
                <p className="text-[#8A8A8A] text-xs text-center">
                  Context uplift: +{formatPercent(getBreakdownSummary()!.uplift)} | Floor: {formatPercent(getBreakdownSummary()!.appliedFloor)} | Signals: {getBreakdownSummary()!.adjustmentCount}
                </p>
              )}
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.reason_code ?? 'Unusual activity detected. Please verify your identity to continue.'}</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#FF9F0A] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E68F09]">
                Verify Identity
              </button>
            </div>
          )}

          {/* 5. Transaction Blocked */}
          {modalState === 'blocked' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#FF3B30] rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(255,59,48,0.25)]">
              <div className="w-16 h-16 rounded-full bg-[#FF3B3020] flex items-center justify-center">
                <ShieldAlert size={32} className="text-[#FF3B30]" />
              </div>
              <h2 className="text-white text-[22px] font-bold font-['Sora'] text-center">Status: Transaction Blocked</h2>
              <div className="bg-[#FF3B3015] px-4 py-2 rounded-full">
                <span className="text-[#FF3B30] font-semibold text-sm">Risk Score: {formatPercent(fraudResult?.risk_score)} (High)</span>
              </div>
              <p className="text-[#8A8A8A] text-xs text-center">Raw ML Score: {formatPercent(fraudResult?.model_score)}</p>
              {getBreakdownSummary() && (
                <p className="text-[#8A8A8A] text-xs text-center">
                  Context uplift: +{formatPercent(getBreakdownSummary()!.uplift)} | Floor: {formatPercent(getBreakdownSummary()!.appliedFloor)} | Signals: {getBreakdownSummary()!.adjustmentCount}
                </p>
              )}
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">{fraudResult?.reason_code ?? 'This transaction has been blocked due to high fraud risk.'}</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#FF3B30] text-white rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E6352B]">
                Contact Support
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
