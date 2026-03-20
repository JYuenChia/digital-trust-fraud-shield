import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Plus, CreditCard, CheckCircle2, Landmark, Smartphone } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';

type VerificationState = 'verified' | 'pending' | 'action_required';

type LinkedCard = {
  id: string;
  holderName: string;
  bankName: string;
  last4: string;
  type: 'debit' | 'credit';
  status: VerificationState;
};

type GuardianContact = {
  guardian_account: string;
  guardian_name: string;
  phone: string;
  email: string;
  linked_at: string;
};

type GuardianAlertsResponse = {
  guardian_account: string;
  notification_count: number;
  notifications: Array<{
    sender_account: string;
    sender_name: string;
    guardian_account: string;
    guardian_name: string;
    type: string;
    risk_score: number;
    risk_reason: string;
    timestamp: string;
  }>;
};

type RecoveryReportResponse = {
  status: string;
  report_id: string;
  sender_account: string;
  incident_summary: {
    description: string;
    amount_lost: number;
    transaction_date: string;
    fraud_type: string;
    confidence_level: number;
  };
  evidence: Array<{
    category: string;
    findings: string;
    severity: string;
  }>;
  recovery_recommendations: string[];
  next_steps: string;
  generated_at: string;
};

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

const PROFILE_STORAGE_KEY = 'fraud-shield-profile-v1';
const CARD_STORAGE_KEY = 'fraud-shield-cards-v1';
const SENIOR_ACCOUNT = 'ALEX8899';

export default function Profile() {
  const [fullName, setFullName] = useState(() => {
    const saved = localStorage.getItem(`${PROFILE_STORAGE_KEY}-name`);
    if (!saved || saved === 'Aminah Mustafa') return 'Alex Tan';
    return saved;
  });
  const [email, setEmail] = useState(() => {
    const saved = localStorage.getItem(`${PROFILE_STORAGE_KEY}-email`);
    if (!saved || saved === 'aminah.mustafa@email.com') return 'alex.tan@email.com';
    return saved;
  });
  const [phone, setPhone] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-phone`) ?? '+60 12-777 8899');
  const [nationality, setNationality] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-nationality`) ?? 'Malaysia');
  const [walletPinEnabled, setWalletPinEnabled] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-pin`) !== 'false');
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-biometric`) === 'true');
  const [saveMessage, setSaveMessage] = useState('');

  const [cards, setCards] = useState<LinkedCard[]>(() => {
    try {
      const raw = localStorage.getItem(CARD_STORAGE_KEY);
      if (!raw) {
        return [
          {
            id: 'card-1',
            holderName: 'Alex Tan',
            bankName: 'Maybank',
            last4: '9281',
            type: 'debit',
            status: 'verified',
          },
        ];
      }
      const parsed = JSON.parse(raw) as LinkedCard[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newCardBank, setNewCardBank] = useState('Maybank');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardHolder, setNewCardHolder] = useState('');
  const [newCardType, setNewCardType] = useState<'debit' | 'credit'>('debit');
  const [verificationStep, setVerificationStep] = useState<'idle' | 'otp' | 'success'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [formError, setFormError] = useState('');

  const [guardians, setGuardians] = useState<GuardianContact[]>([]);
  const [guardianStatus, setGuardianStatus] = useState<string | null>(null);
  const [guardianAlerts, setGuardianAlerts] = useState<GuardianAlertsResponse['notifications']>([]);
  const [selectedGuardianAccount, setSelectedGuardianAccount] = useState('');
  const [isGuardianLoading, setIsGuardianLoading] = useState(false);
  const [guardianForm, setGuardianForm] = useState({
    guardian_account: '',
    guardian_name: '',
    phone: '',
    email: '',
  });
  const [recoveryForm, setRecoveryForm] = useState({
    incident_description: 'Scam transfer attempt detected by AI shield.',
    amount_lost: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [recoveryReportId, setRecoveryReportId] = useState<string | null>(null);
  const [recoveryReport, setRecoveryReport] = useState<RecoveryReportResponse | null>(null);

  const verification = useMemo(() => {
    const fullyVerified = cards.some((c) => c.status === 'verified');
    return {
      kyc: 'verified' as VerificationState,
      face: fullyVerified ? ('verified' as VerificationState) : ('pending' as VerificationState),
      payment: fullyVerified ? ('verified' as VerificationState) : ('action_required' as VerificationState),
    };
  }, [cards]);

  const persistProfile = () => {
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-name`, fullName);
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-email`, email);
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-phone`, phone);
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-nationality`, nationality);
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin`, String(walletPinEnabled));
    localStorage.setItem(`${PROFILE_STORAGE_KEY}-biometric`, String(biometricEnabled));
    setSaveMessage('Profile updated successfully.');
    setTimeout(() => setSaveMessage(''), 1800);
  };

  const persistCards = (nextCards: LinkedCard[]) => {
    setCards(nextCards);
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(nextCards));
  };

  const submitLinkCard = () => {
    setFormError('');
    const sanitizedCard = newCardNumber.replace(/\D/g, '');
    if (sanitizedCard.length < 12 || sanitizedCard.length > 19) {
      setFormError('Please enter a valid card number.');
      return;
    }
    if (!newCardHolder.trim()) {
      setFormError('Card holder name is required.');
      return;
    }
    setVerificationStep('otp');
  };

  const confirmOtp = () => {
    if (otpCode.trim().length < 6) {
      setFormError('Please enter the 6-digit verification code.');
      return;
    }
    const digits = newCardNumber.replace(/\D/g, '');
    const newEntry: LinkedCard = {
      id: `card-${Date.now()}`,
      holderName: newCardHolder.trim(),
      bankName: newCardBank,
      last4: digits.slice(-4),
      type: newCardType,
      status: 'verified',
    };
    persistCards([newEntry, ...cards]);
    setVerificationStep('success');
    setTimeout(() => {
      setShowLinkForm(false);
      setVerificationStep('idle');
      setOtpCode('');
      setNewCardHolder('');
      setNewCardNumber('');
      setNewCardType('debit');
      setNewCardBank('Maybank');
      setFormError('');
    }, 1200);
  };

  const statusPill = (state: VerificationState) => {
    if (state === 'verified') return 'bg-[#32D74B20] text-[#32D74B]';
    if (state === 'pending') return 'bg-[#FF9F0A20] text-[#FF9F0A]';
    return 'bg-[#FF3B3020] text-[#FF3B30]';
  };

  const loadGuardians = async () => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${SENIOR_ACCOUNT}`);
    if (!response.ok) throw new Error('Failed to load guardians');
    const data = await response.json();
    const contacts: GuardianContact[] = data.guardians ?? [];
    setGuardians(contacts);
    if (contacts.length > 0) {
      setSelectedGuardianAccount((prev) => prev || contacts[0].guardian_account);
    } else {
      setSelectedGuardianAccount('');
      setGuardianAlerts([]);
    }
  };

  const loadGuardianAlerts = async (guardianAccount: string) => {
    if (!guardianAccount) {
      setGuardianAlerts([]);
      return;
    }

    const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-notifications/${guardianAccount}`);
    if (!response.ok) throw new Error('Failed to load guardian alerts');
    const data: GuardianAlertsResponse = await response.json();
    setGuardianAlerts(data.notifications ?? []);
  };

  useEffect(() => {
    const bootstrapGuardians = async () => {
      try {
        setIsGuardianLoading(true);
        await loadGuardians();
      } catch {
        setGuardianStatus('Could not load guardian data right now.');
      } finally {
        setIsGuardianLoading(false);
      }
    };

    bootstrapGuardians();
  }, []);

  useEffect(() => {
    if (!selectedGuardianAccount) return;
    loadGuardianAlerts(selectedGuardianAccount).catch(() => {
      setGuardianStatus('Could not load guardian alerts.');
    });
  }, [selectedGuardianAccount]);

  const handleLinkGuardian = async () => {
    if (!guardianForm.guardian_account || !guardianForm.guardian_name || !guardianForm.phone || !guardianForm.email) {
      setGuardianStatus('Please complete all guardian fields.');
      return;
    }

    try {
      setIsGuardianLoading(true);
      setGuardianStatus(null);
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: SENIOR_ACCOUNT,
          ...guardianForm,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Unable to link guardian.');
      }

      setGuardianStatus(data.message || 'Guardian linked successfully.');
      setGuardianForm({ guardian_account: '', guardian_name: '', phone: '', email: '' });
      await loadGuardians();
      if (selectedGuardianAccount) {
        await loadGuardianAlerts(selectedGuardianAccount);
      }
    } catch (error) {
      setGuardianStatus(error instanceof Error ? error.message : 'Unable to link guardian.');
    } finally {
      setIsGuardianLoading(false);
    }
  };

  const handleRemoveGuardian = async (guardianAccount: string) => {
    try {
      setIsGuardianLoading(true);
      setGuardianStatus(null);
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${SENIOR_ACCOUNT}/remove/${guardianAccount}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Unable to remove guardian.');
      }

      setGuardianStatus(data.message || 'Guardian removed.');
      await loadGuardians();
    } catch (error) {
      setGuardianStatus(error instanceof Error ? error.message : 'Unable to remove guardian.');
    } finally {
      setIsGuardianLoading(false);
    }
  };

  const handleGenerateRecoveryReport = async () => {
    if (!selectedGuardianAccount) {
      setGuardianStatus('Please choose a guardian first.');
      return;
    }

    const amountLost = Number(recoveryForm.amount_lost || 0);
    if (!Number.isFinite(amountLost) || amountLost < 0) {
      setGuardianStatus('Enter a valid amount lost (0 or higher).');
      return;
    }

    try {
      setIsGuardianLoading(true);
      setRecoveryReportId(null);
      setRecoveryReport(null);
      setGuardianStatus(null);
      const response = await fetch(`${FRAUD_API_BASE_URL}/recovery-report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: SENIOR_ACCOUNT,
          guardian_account: selectedGuardianAccount,
          incident_description: recoveryForm.incident_description,
          amount_lost: amountLost,
          transaction_date: recoveryForm.transaction_date,
        }),
      });

      if (!response.ok) throw new Error('Unable to generate recovery report.');
      const data: RecoveryReportResponse = await response.json();
      setRecoveryReportId(data.report_id || null);
      setRecoveryReport(data);
      setGuardianStatus('Recovery report generated. Share it with bank and authorities.');
      await loadGuardianAlerts(selectedGuardianAccount);
    } catch {
      setGuardianStatus('Unable to generate recovery report right now.');
    } finally {
      setIsGuardianLoading(false);
    }
  };

  const downloadRecoveryReport = () => {
    if (!recoveryReport) return;
    const blob = new Blob([JSON.stringify(recoveryReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recoveryReport.report_id || 'recovery-report'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.48] blur-[160px] rounded-[100%] bottom-[-420px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.09] blur-[140px] rounded-[100%] bottom-[-320px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.07] blur-[140px] rounded-[100%] bottom-[-320px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1480px] relative z-10 px-10 py-10 pb-16 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-white font-['Sora'] text-4xl font-bold">Profile & Payment Security</h1>
          <p className="text-[#8A8A8A] text-lg">Manage account details, verification status, and linked bank cards.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#1A1A1A]/55 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-bold font-['Sora']">Account Details</h2>
              <button onClick={persistProfile} className="bg-[#FF5500] hover:bg-[#E04B00] transition-colors px-5 py-2 rounded-lg text-white font-semibold text-sm">Save Changes</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <label className="text-[#8A8A8A] text-sm">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-transparent text-white font-semibold outline-none" />
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <label className="text-[#8A8A8A] text-sm">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent text-white font-semibold outline-none" />
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <label className="text-[#8A8A8A] text-sm">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-transparent text-white font-semibold outline-none" />
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <label className="text-[#8A8A8A] text-sm">Nationality</label>
                <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="bg-transparent text-white font-semibold outline-none" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <button onClick={() => setWalletPinEnabled((v) => !v)} className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${walletPinEnabled ? 'border-[#32D74B55] bg-[#32D74B10]' : 'border-white/10 bg-[#141414]'}`}>
                  <span className="text-white text-sm font-semibold">Wallet PIN Protection</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${walletPinEnabled ? 'bg-[#32D74B30] text-[#32D74B]' : 'bg-[#FF3B3020] text-[#FF3B30]'}`}>{walletPinEnabled ? 'ON' : 'OFF'}</span>
                </button>
                {!walletPinEnabled && (
                  <p className="text-[#FF9F0A] text-xs px-2">When Wallet PIN is enabled, your PIN will be required to authorize every transaction.</p>
                )}
              </div>
            </div>

            {saveMessage && <div className="text-[#32D74B] text-sm font-semibold">{saveMessage}</div>}
          </div>
        </div>

        <div className="bg-[#1A1A1A]/55 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold font-['Sora']">Linked Bank Cards</h2>
            <button onClick={() => setShowLinkForm((v) => !v)} className="inline-flex items-center gap-2 bg-[#FF5500] hover:bg-[#E04B00] transition-colors px-4 py-2 rounded-lg text-white font-semibold text-sm">
              <Plus size={16} /> Link Bank Card
            </button>
          </div>

          {showLinkForm && (
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[#8A8A8A] text-xs">Bank</label>
                  <select value={newCardBank} onChange={(e) => setNewCardBank(e.target.value)} className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-white">
                    {MALAYSIA_BANKS.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#8A8A8A] text-xs">Card Number</label>
                  <input value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#8A8A8A] text-xs">Card Holder</label>
                  <input value={newCardHolder} onChange={(e) => setNewCardHolder(e.target.value)} placeholder="Name on card" className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#8A8A8A] text-xs">Card Type</label>
                  <select value={newCardType} onChange={(e) => setNewCardType(e.target.value as 'debit' | 'credit')} className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-white">
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              {verificationStep === 'idle' && (
                <button onClick={submitLinkCard} className="self-start bg-[#FF5500] hover:bg-[#E04B00] px-4 py-2 rounded-lg text-white font-semibold text-sm">Start Verification</button>
              )}

              {verificationStep === 'otp' && (
                <div className="flex flex-wrap items-center gap-3">
                  <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 6-digit OTP" className="bg-[#0F0F0F] border border-white/10 rounded-lg px-3 py-2 text-white" />
                  <button onClick={confirmOtp} className="bg-[#32D74B] hover:bg-[#2EC046] px-4 py-2 rounded-lg text-[#0B0B0B] font-semibold text-sm">Confirm OTP</button>
                </div>
              )}

              {verificationStep === 'success' && (
                <div className="inline-flex items-center gap-2 text-[#32D74B] font-semibold text-sm">
                  <CheckCircle2 size={16} /> Card linked and verified successfully.
                </div>
              )}

              {formError && <div className="text-[#FF3B30] text-sm">{formError}</div>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CreditCard size={18} className="text-[#FF5500]" />
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${statusPill(card.status)}`}>{card.status.toUpperCase()}</span>
                </div>
                <div className="text-white font-semibold">{card.bankName}</div>
                <div className="text-[#8A8A8A] text-sm">{card.type.toUpperCase()} • •••• {card.last4}</div>
                <div className="text-[#B8B8B8] text-xs">Card Holder: {card.holderName}</div>
              </div>
            ))}
          </div>

          {cards.length === 0 && (
            <div className="text-[#8A8A8A] text-sm">No linked cards yet. Add one to enable instant transfers and top-ups.</div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#121A24]/70 backdrop-blur-2xl p-7 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.18em] text-[#7EC8FF]">Guardian Link</span>
                <span className="text-sm text-white">Add and manage trusted family guardians.</span>
              </div>
              <span className="rounded-full bg-[#7EC8FF22] px-3 py-1 text-xs font-semibold text-[#9DD7FF]">
                {guardians.length} linked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={guardianForm.guardian_name}
                onChange={(e) => setGuardianForm((prev) => ({ ...prev, guardian_name: e.target.value }))}
                placeholder="Guardian full name"
                className="rounded-lg border border-white/10 bg-[#0E1420] px-3 py-2 text-sm text-white outline-none focus:border-[#7EC8FF]"
              />
              <input
                type="text"
                value={guardianForm.guardian_account}
                onChange={(e) => setGuardianForm((prev) => ({ ...prev, guardian_account: e.target.value.toUpperCase() }))}
                placeholder="Guardian account ID"
                className="rounded-lg border border-white/10 bg-[#0E1420] px-3 py-2 text-sm text-white outline-none focus:border-[#7EC8FF]"
              />
              <input
                type="text"
                value={guardianForm.phone}
                onChange={(e) => setGuardianForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone (e.g. +60-12-0000000)"
                className="rounded-lg border border-white/10 bg-[#0E1420] px-3 py-2 text-sm text-white outline-none focus:border-[#7EC8FF]"
              />
              <input
                type="email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-white/10 bg-[#0E1420] px-3 py-2 text-sm text-white outline-none focus:border-[#7EC8FF]"
              />
            </div>

            <button
              type="button"
              onClick={handleLinkGuardian}
              disabled={isGuardianLoading}
              className="rounded-lg bg-[#2F83C9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#276FA8] disabled:opacity-60"
            >
              {isGuardianLoading ? 'Saving...' : 'Link Guardian'}
            </button>

            <div className="flex flex-col gap-2 max-h-44 overflow-auto pr-1">
              {guardians.length === 0 && <p className="text-sm text-[#94A4B8]">No guardian linked yet.</p>}
              {guardians.map((g) => (
                <div key={g.guardian_account} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{g.guardian_name}</span>
                    <span className="text-xs text-[#A8B4C4]">{g.guardian_account} • {g.phone} • {g.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGuardian(g.guardian_account)}
                    className="text-xs font-semibold text-[#FF9F9A] hover:text-[#FFD0CC]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#1E1622]/70 backdrop-blur-2xl p-7 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.18em] text-[#FFB37A]">Guardian Dashboard</span>
                <span className="text-sm text-white">Review high-risk alerts and generate recovery evidence.</span>
              </div>
              <button
                type="button"
                onClick={() => loadGuardianAlerts(selectedGuardianAccount)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Refresh Alerts
              </button>
            </div>

            <select
              value={selectedGuardianAccount}
              onChange={(e) => setSelectedGuardianAccount(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#120E15] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Choose guardian account</option>
              {guardians.map((g) => (
                <option key={g.guardian_account} value={g.guardian_account}>
                  {g.guardian_name} ({g.guardian_account})
                </option>
              ))}
            </select>

            <div className="rounded-lg border border-white/10 bg-[#120E15] p-3 max-h-40 overflow-auto">
              {guardianAlerts.length === 0 && <p className="text-sm text-[#B8A9B7]">No high-risk alerts yet.</p>}
              {guardianAlerts.map((alert, idx) => (
                <div key={`${alert.timestamp}-${idx}`} className="py-2 border-b border-white/10 last:border-b-0">
                  <p className="text-sm text-white font-semibold">{Math.round((alert.risk_score || 0) * 100)}% risk • {alert.sender_name}</p>
                  <p className="text-xs text-[#C9BAC8]">{alert.risk_reason}</p>
                  <p className="text-[11px] text-[#978A96]">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={recoveryForm.incident_description}
                onChange={(e) => setRecoveryForm((prev) => ({ ...prev, incident_description: e.target.value }))}
                placeholder="Incident summary"
                className="md:col-span-2 rounded-lg border border-white/10 bg-[#120E15] px-3 py-2 text-sm text-white outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={recoveryForm.amount_lost}
                onChange={(e) => setRecoveryForm((prev) => ({ ...prev, amount_lost: e.target.value }))}
                placeholder="Amount lost"
                className="rounded-lg border border-white/10 bg-[#120E15] px-3 py-2 text-sm text-white outline-none"
              />
              <input
                type="date"
                value={recoveryForm.transaction_date}
                onChange={(e) => setRecoveryForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                className="rounded-lg border border-white/10 bg-[#120E15] px-3 py-2 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateRecoveryReport}
                disabled={isGuardianLoading}
                className="rounded-lg bg-[#D8762A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#BC6623] disabled:opacity-60"
              >
                Generate AI Evidence
              </button>
            </div>

            {recoveryReportId && (
              <p className="text-xs font-semibold text-[#FFD3A9]">Recovery report ID: {recoveryReportId}</p>
            )}

            {recoveryReport && (
              <div className="rounded-xl border border-[#FFB37A44] bg-[#FFB37A12] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#FFD6B0]">AI Evidence Report Ready</p>
                    <p className="text-xs text-[#EAC8A8]">Generated: {new Date(recoveryReport.generated_at).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadRecoveryReport}
                    className="rounded-lg border border-[#FFD6B0]/50 px-3 py-1.5 text-xs font-semibold text-[#FFD6B0] hover:bg-[#FFFFFF12]"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#1C1417] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D9B999]">Incident Summary</p>
                  <p className="mt-1 text-sm text-white">{recoveryReport.incident_summary.description}</p>
                  <p className="mt-1 text-xs text-[#D8C2B0]">
                    Fraud Type: {recoveryReport.incident_summary.fraud_type} | Confidence: {Math.round(recoveryReport.incident_summary.confidence_level * 100)}%
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#1C1417] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D9B999]">Evidence Findings</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {recoveryReport.evidence.map((item, idx) => (
                      <div key={`${item.category}-${idx}`} className="text-xs text-[#E9D4C2]">
                        <p className="font-semibold text-white">{item.category} ({item.severity})</p>
                        <p>{item.findings}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#1C1417] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#D9B999]">Recovery Steps</p>
                  <div className="mt-2 flex flex-col gap-1">
                    {recoveryReport.recovery_recommendations.map((step, idx) => (
                      <p key={`${step}-${idx}`} className="text-xs text-[#E9D4C2]">{idx + 1}. {step}</p>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#FFD6B0]">Next: {recoveryReport.next_steps}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {guardianStatus && (
          <div className="rounded-xl border border-[#7EC8FF44] bg-[#7EC8FF14] px-4 py-3 text-sm text-[#CFEBFF]">
            {guardianStatus}
          </div>
        )}

        <div className="flex items-center gap-4 bg-[#FFFFFF06] border border-white/10 rounded-xl p-4">
          <ShieldAlert size={20} className="text-[#FF9F0A]" />
          <span className="text-[#8A8A8A] text-sm">Profile and card changes are simulated locally for demo mode (no external banking API call).</span>
        </div>
      </div>
    </div>
  );
}
