import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Plus, CreditCard, CheckCircle2, Landmark, Smartphone, X, User, Mail } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Link } from 'wouter';

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
  status?: string;
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

type ProfileTab = 'account' | 'cards' | 'guardian-link' | 'guardian-dashboard';

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
  const { language, setLanguage, t } = useLanguage();
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
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');

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
    guardian_name: '',
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
    setSaveMessage(t('profile.updated'));
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
    if (state === 'verified') return 'bg-green-50 text-green-600 border border-green-100';
    if (state === 'pending') return 'bg-orange-50 text-orange-600 border border-orange-100';
    return 'bg-red-50 text-red-600 border border-red-100';
  };

  const loadGuardians = async () => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${SENIOR_ACCOUNT}`);
    if (!response.ok) throw new Error('Failed to load guardians');
    const data = await response.json();
    const contacts: GuardianContact[] = data.guardians ?? [];
    setGuardians(contacts);
    if (contacts.length > 0) {
      // Find first accepted guardian to select by default for alerts
      const firstAccepted = contacts.find(g => g.status === 'ACCEPTED');
      setSelectedGuardianAccount(prev => prev || firstAccepted?.guardian_account || contacts[0].guardian_account);
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
    if (!guardianForm.guardian_name || !guardianForm.email) {
      toast.error('Please complete both guardian name and email.');
      return;
    }

    try {
      setIsGuardianLoading(true);
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/send-email-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account: SENIOR_ACCOUNT,
          guardian_name: guardianForm.guardian_name,
          guardian_email: guardianForm.email,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Unable to send invitation.');
      }

      toast.success(`Invitation email sent to ${guardianForm.email}`);
      setGuardianForm({ guardian_name: '', email: '' });
      await loadGuardians();
    } catch (error: any) {
      toast.error(error.message || 'Unable to send invitation.');
    } finally {
      setIsGuardianLoading(false);
    }
  };

  const handleRemoveGuardian = async (guardianAccount: string) => {
    try {
      setIsGuardianLoading(true);
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${SENIOR_ACCOUNT}/remove/${guardianAccount}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Unable to remove guardian.');
      }

      toast.success(data.message || 'Guardian removed.');
      await loadGuardians();
    } catch (error: any) {
      toast.error(error.message || 'Unable to remove guardian.');
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

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'account', label: 'Account' },
    { id: 'cards', label: 'Linked Bank Cards' },
    { id: 'guardian-link', label: 'Guardian Link' },
    { id: 'guardian-dashboard', label: 'Guardian Dashboard' },
  ];

  const primaryButtonClass = 'h-10 rounded-[8px] px-6 text-sm font-semibold transition-all shadow-sm active:scale-95';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-foreground font-sans flex flex-col items-center pt-16">
      <div className="w-full max-w-[1480px] px-8 py-10 pb-16 flex flex-col gap-8">
        <div data-tour="profile-header" className="flex flex-col gap-2">
          <h1 className="font-['Sora'] text-4xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-gray-500 text-lg">{t('profile.subtitle')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-[12px] shadow-sm border border-[#E5E7EB] overflow-hidden">
          <aside className="lg:w-72 lg:shrink-0 bg-transparent border-r border-[#F3F4F6]">
            <nav className="flex lg:flex-col p-4 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-11 rounded-[8px] px-4 text-sm font-medium text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex-1 p-8 md:p-10 flex flex-col gap-8 bg-white min-h-[600px]">
            {activeTab === 'account' && (
              <>
                <div className="flex items-center justify-between gap-3" data-tour="profile-security">
                  <h2 className="text-2xl font-['Sora'] font-bold text-gray-900">Account Settings</h2>
                  <button
                    onClick={persistProfile}
                    className={`${primaryButtonClass} bg-[#FF5500] hover:bg-[#E64D00] text-white`}
                  >
                    {t('profile.saveChanges')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 p-5 rounded-[8px] bg-[#F9FAFB] border border-[#F3F4F6]">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('profile.fullName')}</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-transparent text-gray-900 font-medium outline-none text-base" />
                  </div>
                  <div className="flex flex-col gap-2 p-5 rounded-[8px] bg-[#F9FAFB] border border-[#F3F4F6]">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('profile.email')}</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent text-gray-900 font-medium outline-none text-base" />
                  </div>
                  <div className="flex flex-col gap-2 p-5 rounded-[8px] bg-[#F9FAFB] border border-[#F3F4F6]">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('profile.phoneNumber')}</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-transparent text-gray-900 font-medium outline-none text-base" />
                  </div>
                  <div className="flex flex-col gap-2 p-5 rounded-[8px] bg-[#F9FAFB] border border-[#F3F4F6]">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('profile.nationality')}</label>
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="bg-transparent text-gray-900 font-medium outline-none text-base" />
                  </div>
                </div>

                <div className="rounded-[8px] bg-[#F3F4F6] p-6 flex flex-col gap-3 shadow-sm border border-[#E5E7EB]">
                  <div>
                    <span className="text-gray-900 text-sm font-bold">{t('profile.languagePreference')}</span>
                    <p className="text-xs text-gray-500 mt-1">{t('profile.languageHint')}</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'ms' | 'zh')}
                    className="w-full md:w-72 h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-4 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  >
                    <option value="en">{t('language.english')}</option>
                    <option value="ms">{t('language.malay')}</option>
                    <option value="zh">{t('language.chinese')}</option>
                  </select>
                </div>

                {saveMessage && <div className="text-green-600 font-medium bg-green-50 px-4 py-2 rounded-[8px] inline-block self-start">{saveMessage}</div>}
              </>
            )}

            {activeTab === 'cards' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-['Sora'] font-bold text-gray-900">Linked Bank Cards</h2>
                  <button onClick={() => setShowLinkForm((v) => !v)} className={`${primaryButtonClass} inline-flex items-center gap-2 bg-[#FF5500] hover:bg-[#E64D00] text-white`}>
                    <Plus size={16} /> Link Bank Card
                  </button>
                </div>

                {showLinkForm && (
                  <div className="rounded-[8px] bg-[#F9FAFB] p-6 flex flex-col gap-6 shadow-sm border border-[#E5E7EB]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-500 text-xs font-semibold uppercase">Bank</label>
                        <select value={newCardBank} onChange={(e) => setNewCardBank(e.target.value)} className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-3 text-sm text-gray-900">
                          {MALAYSIA_BANKS.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-500 text-xs font-semibold uppercase">Card Number</label>
                        <input value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-3 text-sm text-gray-900" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-500 text-xs font-semibold uppercase">Card Holder</label>
                        <input value={newCardHolder} onChange={(e) => setNewCardHolder(e.target.value)} placeholder="Name on card" className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-3 text-sm text-gray-900" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-500 text-xs font-semibold uppercase">Card Type</label>
                        <select value={newCardType} onChange={(e) => setNewCardType(e.target.value as 'debit' | 'credit')} className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-3 text-sm text-gray-900">
                          <option value="debit">Debit</option>
                          <option value="credit">Credit</option>
                        </select>
                      </div>
                    </div>

                    {verificationStep === 'idle' && (
                      <button onClick={submitLinkCard} className={`${primaryButtonClass} self-start bg-gray-900 hover:bg-black text-white`}>Start Verification</button>
                    )}

                    {verificationStep === 'otp' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 6-digit OTP" className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-4 text-sm text-gray-900" />
                        <button onClick={confirmOtp} className={`${primaryButtonClass} bg-green-600 hover:bg-green-700 text-white`}>Confirm OTP</button>
                      </div>
                    )}

                    {verificationStep === 'success' && (
                      <div className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-[8px] font-semibold text-sm">
                        <CheckCircle2 size={16} /> Card linked and verified successfully.
                      </div>
                    )}

                    {formError && <div className="text-red-600 bg-red-50 px-4 py-2 rounded-[8px] text-sm">{formError}</div>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {cards.map((card) => (
                    <div key={card.id} className="rounded-[8px] p-6 bg-white flex flex-col gap-4 shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                          <CreditCard size={20} className="text-gray-600" />
                        </div>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusPill(card.status)}`}>{card.status.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-gray-900 font-bold text-lg">{card.bankName}</div>
                        <div className="text-gray-500 text-sm mt-1">{card.type.toUpperCase()} • •••• {card.last4}</div>
                      </div>
                      <div className="text-gray-400 text-xs pt-3 border-t border-gray-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {card.holderName}
                      </div>
                    </div>
                  ))}
                </div>

                {cards.length === 0 && (
                  <div className="text-gray-400 text-sm italic bg-gray-50 p-6 rounded-[8px] border border-dashed border-gray-200">No linked cards yet. Add one to enable instant transfers and top-ups.</div>
                )}
              </>
            )}

            {activeTab === 'guardian-link' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-['Sora'] font-bold text-gray-900">Guardian Link</h2>
                  <span className="rounded-full bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-600 border border-orange-100">{guardians.length} linked</span>
                </div>

                <div className="rounded-[8px] bg-[#F9FAFB] p-6 flex flex-col gap-6 shadow-sm border border-[#E5E7EB]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Guardian Name</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={guardianForm.guardian_name}
                          onChange={(e) => setGuardianForm((prev) => ({ ...prev, guardian_name: e.target.value }))}
                          placeholder="Full Name"
                          className="h-12 w-full rounded-[8px] border border-[#D1D5DB] bg-white pl-11 pr-4 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Guardian Email Address</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={guardianForm.email}
                          onChange={(e) => setGuardianForm((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="email@example.com"
                          className="h-12 w-full rounded-[8px] border border-[#D1D5DB] bg-white pl-11 pr-4 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLinkGuardian}
                    disabled={isGuardianLoading}
                    className="h-12 self-start rounded-[8px] bg-[#FF5500] px-8 text-sm font-bold text-white hover:bg-[#E64D00] shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isGuardianLoading ? 'Sending Invite...' : 'Send Invitation Email'}
                  </button>
                </div>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                  {guardians.length === 0 && <p className="text-sm text-gray-400 italic bg-gray-50 p-6 rounded-[8px] border border-dashed border-gray-200">No invitations sent yet.</p>}
                  {guardians.map((g) => (
                    <div key={g.email} className="rounded-[8px] bg-white px-5 py-4 flex items-center justify-between gap-4 shadow-sm border border-[#E5E7EB]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold">
                          {g.guardian_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{g.guardian_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              g.status === 'ACCEPTED' ? 'bg-green-50 text-green-600 border-green-100' :
                              g.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                              {g.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{g.email}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuardian(g.status === 'ACCEPTED' ? g.guardian_account : g.email)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-[6px] transition-colors"
                      >
                        {g.status === 'ACCEPTED' ? 'Remove' : 'Cancel Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'guardian-dashboard' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h2 className="text-2xl font-['Sora'] font-bold text-gray-900">Guardian Hub</h2>
                  <div className="flex items-center gap-3">
                    <Link href="/guardian-notifications">
                      <button type="button" className={`${primaryButtonClass} bg-white border border-[#D1D5DB] text-gray-700 hover:bg-gray-50`}>Alert History</button>
                    </Link>
                    <button type="button" onClick={() => loadGuardianAlerts(selectedGuardianAccount)} className={`${primaryButtonClass} bg-white border border-[#D1D5DB] text-gray-700 hover:bg-gray-50`}>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Left Column: Management */}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Select Guardian Account</label>
                        <select
                        value={selectedGuardianAccount}
                        onChange={(e) => setSelectedGuardianAccount(e.target.value)}
                        className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-4 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                        <option value="">Choose guardian account...</option>
                        {guardians.map((g) => (
                            <option key={g.guardian_account} value={g.guardian_account}>
                            {g.guardian_name} ({g.guardian_account})
                            </option>
                        ))}
                        </select>
                    </div>

                    <div className="rounded-[8px] bg-[#F9FAFB] p-6 border border-[#E5E7EB] flex flex-col gap-5 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                            <ShieldAlert size={18} className="text-orange-500" />
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Risk Alerts</h3>
                        </div>
                        <div className="max-h-64 overflow-auto pr-2 custom-scrollbar flex flex-col gap-3">
                            {guardianAlerts.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400 italic">No threats monitored yet.</p>
                                </div>
                            )}
                            {guardianAlerts.map((alert, idx) => (
                                <div key={`${alert.timestamp}-${idx}`} className="p-4 bg-white rounded-[8px] border border-[#F3F4F6] shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                                            {Math.round((alert.risk_score || 0) * 100)}% risk
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-900 font-bold">{alert.sender_name}</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.risk_reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>

                  {/* Right Column: AI Recovery */}
                  <div className="flex flex-col gap-6">
                    <div className="rounded-[8px] bg-white p-6 border border-[#E5E7EB] flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-3">
                            <CheckCircle2 size={18} className="text-orange-500" />
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">AI Evidence Generation</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase">Incident Summary</label>
                                <textarea
                                    value={recoveryForm.incident_description}
                                    onChange={(e) => setRecoveryForm((prev) => ({ ...prev, incident_description: e.target.value }))}
                                    placeholder="Describe the suspicious activity..."
                                    className="h-24 rounded-[8px] border border-[#D1D5DB] bg-white p-4 text-sm text-gray-900 resize-none outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">Amount (RM)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={recoveryForm.amount_lost}
                                        onChange={(e) => setRecoveryForm((prev) => ({ ...prev, amount_lost: e.target.value }))}
                                        placeholder="0.00"
                                        className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-4 text-sm text-gray-900"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">Incident Date</label>
                                    <input
                                        type="date"
                                        value={recoveryForm.transaction_date}
                                        onChange={(e) => setRecoveryForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                                        className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-4 text-sm text-gray-900"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateRecoveryReport}
                                disabled={isGuardianLoading}
                                className={`${primaryButtonClass} bg-[#FF5500] hover:bg-[#E64D00] text-white disabled:opacity-60 mt-2`}
                            >
                                {isGuardianLoading ? 'Processing AI...' : 'Generate Evidence Report'}
                            </button>
                        </div>
                    </div>

                    {recoveryReport && (
                        <div className="rounded-[12px] border-2 border-orange-100 bg-orange-50/30 p-6 flex flex-col gap-5 shadow-inner">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Smartphone size={20} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">AI Recovery Dossier Ready</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Verified Evidence • {new Date(recoveryReport.generated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadRecoveryReport}
                                    className="h-9 rounded-[8px] bg-white border border-[#D1D5DB] px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
                                >
                                    JSON EXPORT
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-white p-4 rounded-[8px] shadow-sm border border-orange-50">
                                    <h4 className="text-[10px] font-bold text-orange-600 uppercase mb-2">Findings</h4>
                                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{recoveryReport.incident_summary.description}</p>
                                </div>
                                <div className="bg-white p-4 rounded-[8px] shadow-sm border border-orange-50">
                                    <h4 className="text-[10px] font-bold text-orange-600 uppercase mb-2">Confidence Level</h4>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                                        <div className="bg-orange-500 h-full" style={{ width: `${recoveryReport.incident_summary.confidence_level * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{Math.round(recoveryReport.incident_summary.confidence_level * 100)}% Certainty</p>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {guardianStatus && (
              <div className="mt-auto px-6 py-4 rounded-[8px] bg-gray-50 border border-[#E5E7EB] text-sm text-gray-600 font-medium flex items-center gap-3 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                {guardianStatus}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
