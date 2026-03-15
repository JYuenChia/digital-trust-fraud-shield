import React, { useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Plus, CreditCard, CheckCircle2, Landmark, Smartphone } from 'lucide-react';

type VerificationState = 'verified' | 'pending' | 'action_required';

type LinkedCard = {
  id: string;
  holderName: string;
  bankName: string;
  last4: string;
  type: 'debit' | 'credit';
  status: VerificationState;
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

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setWalletPinEnabled((v) => !v)} className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${walletPinEnabled ? 'border-[#32D74B55] bg-[#32D74B10]' : 'border-white/10 bg-[#141414]'}`}>
                <span className="text-white text-sm font-semibold">Wallet PIN Protection</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${walletPinEnabled ? 'bg-[#32D74B30] text-[#32D74B]' : 'bg-[#FF3B3020] text-[#FF3B30]'}`}>{walletPinEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <button onClick={() => setBiometricEnabled((v) => !v)} className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${biometricEnabled ? 'border-[#32D74B55] bg-[#32D74B10]' : 'border-white/10 bg-[#141414]'}`}>
                <span className="text-white text-sm font-semibold">Biometric Login</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${biometricEnabled ? 'bg-[#32D74B30] text-[#32D74B]' : 'bg-[#FF3B3020] text-[#FF3B30]'}`}>{biometricEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {saveMessage && <div className="text-[#32D74B] text-sm font-semibold">{saveMessage}</div>}
          </div>

          <div className="bg-[#1A1A1A]/55 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 flex flex-col gap-5">
            <h2 className="text-white text-xl font-bold font-['Sora']">Verification Center</h2>

            <div className="flex items-center justify-between bg-[#141414] border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[#32D74B]" />
                <span className="text-white font-semibold text-sm">eKYC Identity</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusPill(verification.kyc)}`}>{verification.kyc.toUpperCase()}</span>
            </div>

            <div className="flex items-center justify-between bg-[#141414] border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-[#FF9F0A]" />
                <span className="text-white font-semibold text-sm">Device & Face Match</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusPill(verification.face)}`}>{verification.face.toUpperCase()}</span>
            </div>

            <div className="flex items-center justify-between bg-[#141414] border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Landmark size={18} className="text-[#FF3B30]" />
                <span className="text-white font-semibold text-sm">Linked Payment Method</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusPill(verification.payment)}`}>{verification.payment.toUpperCase()}</span>
            </div>

            <div className="bg-[#FFFFFF08] border border-white/10 rounded-xl p-4 text-sm text-[#8A8A8A]">
              Security checks run in real time for card linking, OTP challenge, and transaction authorization.
            </div>
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

        <div className="flex items-center gap-4 bg-[#FFFFFF06] border border-white/10 rounded-xl p-4">
          <ShieldAlert size={20} className="text-[#FF9F0A]" />
          <span className="text-[#8A8A8A] text-sm">Profile and card changes are simulated locally for demo mode (no external banking API call).</span>
        </div>
      </div>
    </div>
  );
}
