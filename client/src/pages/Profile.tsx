import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Plus, CreditCard, CheckCircle2, Landmark, Smartphone, Sun, Moon, X } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();
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
  const [walletPinEnabled, setWalletPinEnabled] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-pin`) !== 'false');
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem(`${PROFILE_STORAGE_KEY}-biometric`) === 'true');
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPin, setNewPin] = useState('');
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

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'account', label: 'Account' },
    { id: 'cards', label: 'Linked Bank Cards' },
    { id: 'guardian-link', label: 'Guardian Link' },
    { id: 'guardian-dashboard', label: 'Guardian Dashboard' },
  ];

  const primaryButtonClass = 'h-10 rounded-lg px-4 text-sm font-semibold transition-colors';

  return (
    <div className="min-h-screen bg-background text-foreground font-['Inter'] flex flex-col items-center pt-16">
      <div className="w-full max-w-[1480px] px-8 py-10 pb-16 flex flex-col gap-8">
        <div data-tour="profile-header" className="flex flex-col gap-2">
          <h1 className="font-['Sora'] text-4xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('profile.subtitle')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm">
          <aside className="lg:w-64 lg:shrink-0">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-10 rounded-lg px-4 text-sm font-semibold text-left whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="hidden lg:block w-px bg-border" aria-hidden="true" />

          <section className="flex-1 flex flex-col gap-6">
            {activeTab === 'account' && (
              <>
                <div className="flex items-center justify-between gap-3" data-tour="profile-security">
                  <h2 className="text-2xl font-['Sora'] font-bold text-foreground">Account</h2>
                  <button
                    onClick={persistProfile}
                    className={`${primaryButtonClass} bg-primary hover:opacity-90 text-primary-foreground`}
                  >
                    {t('profile.saveChanges')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
                    <label className="text-sm text-muted-foreground">{t('profile.fullName')}</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-transparent text-foreground font-semibold outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
                    <label className="text-sm text-muted-foreground">{t('profile.email')}</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent text-foreground font-semibold outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
                    <label className="text-sm text-muted-foreground">{t('profile.phoneNumber')}</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-transparent text-foreground font-semibold outline-none" />
                  </div>
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
                    <label className="text-sm text-muted-foreground">{t('profile.nationality')}</label>
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="bg-transparent text-foreground font-semibold outline-none" />
                  </div>
                </div>

                <div className="rounded-xl bg-muted p-4 flex flex-col gap-2">
                  <span className="text-foreground text-sm font-semibold">{t('profile.languagePreference')}</span>
                  <p className="text-xs text-muted-foreground">{t('profile.languageHint')}</p>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'ms' | 'zh')}
                    className="w-full md:w-72 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="en">{t('language.english')}</option>
                    <option value="ms">{t('language.malay')}</option>
                    <option value="zh">{t('language.chinese')}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-xl p-4 bg-muted">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="text-muted-foreground" size={20} /> : <Sun className="text-[#F59E0B]" size={20} />}
                      <span className="text-foreground text-sm font-semibold">{t('profile.applicationTheme')}</span>
                    </div>
                    {toggleTheme && (
                      <button onClick={toggleTheme} className={`${primaryButtonClass} border border-input bg-background text-foreground`}>
                        {theme === 'light' ? t('profile.switchDark') : t('profile.switchLight')}
                      </button>
                    )}
                  </div>

                  <div data-tour="profile-wallet-pin" className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (walletPinEnabled) {
                          setWalletPinEnabled(false);
                          localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin`, 'false');
                          localStorage.removeItem(`${PROFILE_STORAGE_KEY}-pin-value`);
                        } else {
                          setShowPinSetupModal(true);
                          setNewPin('');
                        }
                      }}
                      className="flex items-center justify-between rounded-xl p-4 bg-muted"
                    >
                      <span className="text-foreground text-sm font-semibold">{t('profile.walletPinProtection')}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${walletPinEnabled ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{walletPinEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                    {!walletPinEnabled && (
                      <p className="text-[#D97706] text-xs px-2">When Wallet PIN is enabled, your PIN will be required to authorize every transaction.</p>
                    )}
                  </div>
                </div>

                {saveMessage && <div className="text-[#15803D] text-sm font-semibold">{saveMessage}</div>}
              </>
            )}

            {activeTab === 'cards' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-['Sora'] font-bold text-foreground">Linked Bank Cards</h2>
                  <button onClick={() => setShowLinkForm((v) => !v)} className={`${primaryButtonClass} inline-flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground`}>
                    <Plus size={16} /> Link Bank Card
                  </button>
                </div>

                {showLinkForm && (
                  <div className="rounded-xl bg-muted p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-muted-foreground text-xs">Bank</label>
                        <select value={newCardBank} onChange={(e) => setNewCardBank(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-foreground">
                          {MALAYSIA_BANKS.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted-foreground text-xs">Card Number</label>
                        <input value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" className="h-10 rounded-lg border border-input bg-background px-3 text-foreground" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted-foreground text-xs">Card Holder</label>
                        <input value={newCardHolder} onChange={(e) => setNewCardHolder(e.target.value)} placeholder="Name on card" className="h-10 rounded-lg border border-input bg-background px-3 text-foreground" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-muted-foreground text-xs">Card Type</label>
                        <select value={newCardType} onChange={(e) => setNewCardType(e.target.value as 'debit' | 'credit')} className="h-10 rounded-lg border border-input bg-background px-3 text-foreground">
                          <option value="debit">Debit</option>
                          <option value="credit">Credit</option>
                        </select>
                      </div>
                    </div>

                    {verificationStep === 'idle' && (
                      <button onClick={submitLinkCard} className={`${primaryButtonClass} self-start bg-primary hover:opacity-90 text-primary-foreground`}>Start Verification</button>
                    )}

                    {verificationStep === 'otp' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 6-digit OTP" className="h-10 rounded-lg border border-input bg-background px-3 text-foreground" />
                        <button onClick={confirmOtp} className={`${primaryButtonClass} bg-[#16A34A] hover:bg-[#15803D] text-white`}>Confirm OTP</button>
                      </div>
                    )}

                    {verificationStep === 'success' && (
                      <div className="inline-flex items-center gap-2 text-[#15803D] font-semibold text-sm">
                        <CheckCircle2 size={16} /> Card linked and verified successfully.
                      </div>
                    )}

                    {formError && <div className="text-[#B91C1C] text-sm">{formError}</div>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {cards.map((card) => (
                    <div key={card.id} className="rounded-xl p-5 bg-muted flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <CreditCard size={18} className="text-foreground" />
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${statusPill(card.status)}`}>{card.status.toUpperCase()}</span>
                      </div>
                      <div className="text-foreground font-semibold">{card.bankName}</div>
                      <div className="text-muted-foreground text-sm">{card.type.toUpperCase()} • •••• {card.last4}</div>
                      <div className="text-muted-foreground text-xs">Card Holder: {card.holderName}</div>
                    </div>
                  ))}
                </div>

                {cards.length === 0 && (
                  <div className="text-muted-foreground text-sm">No linked cards yet. Add one to enable instant transfers and top-ups.</div>
                )}
              </>
            )}

            {activeTab === 'guardian-link' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-['Sora'] font-bold text-foreground">Guardian Link</h2>
                  <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">{guardians.length} linked</span>
                </div>

                <div className="rounded-xl bg-muted p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={guardianForm.guardian_name}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, guardian_name: e.target.value }))}
                      placeholder="Guardian full name"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <input
                      type="text"
                      value={guardianForm.guardian_account}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, guardian_account: e.target.value.toUpperCase() }))}
                      placeholder="Guardian account ID"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <input
                      type="text"
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <input
                      type="email"
                      value={guardianForm.email}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleLinkGuardian}
                    disabled={isGuardianLoading}
                    className={`${primaryButtonClass} self-start bg-primary hover:opacity-90 text-primary-foreground disabled:opacity-60`}
                  >
                    {isGuardianLoading ? 'Saving...' : 'Link Guardian'}
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[360px] overflow-auto pr-1">
                  {guardians.length === 0 && <p className="text-sm text-muted-foreground">No guardian linked yet.</p>}
                  {guardians.map((g) => (
                    <div key={g.guardian_account} className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{g.guardian_name}</span>
                        <span className="text-xs text-muted-foreground">{g.guardian_account} • {g.phone} • {g.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuardian(g.guardian_account)}
                        className="text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'guardian-dashboard' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h2 className="text-2xl font-['Sora'] font-bold text-foreground">Guardian Dashboard</h2>
                  <div className="flex items-center gap-2">
                    <Link href="/guardian-notifications">
                      <button type="button" className={`${primaryButtonClass} border border-input text-foreground bg-background`}>Guardian Notifications</button>
                    </Link>
                    <button type="button" onClick={() => loadGuardianAlerts(selectedGuardianAccount)} className={`${primaryButtonClass} border border-input text-foreground bg-background`}>
                      Refresh Alerts
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted p-5 flex flex-col gap-4">
                  <select
                    value={selectedGuardianAccount}
                    onChange={(e) => setSelectedGuardianAccount(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Choose guardian account</option>
                    {guardians.map((g) => (
                      <option key={g.guardian_account} value={g.guardian_account}>
                        {g.guardian_name} ({g.guardian_account})
                      </option>
                    ))}
                  </select>

                  <div className="rounded-lg bg-background p-3 max-h-44 overflow-auto border border-border">
                    {guardianAlerts.length === 0 && <p className="text-sm text-muted-foreground">No high-risk alerts yet.</p>}
                    {guardianAlerts.map((alert, idx) => (
                      <div key={`${alert.timestamp}-${idx}`} className="py-2 border-b border-border/60 last:border-b-0">
                        <p className="text-sm text-foreground font-semibold">{Math.round((alert.risk_score || 0) * 100)}% risk • {alert.sender_name}</p>
                        <p className="text-xs text-muted-foreground">{alert.risk_reason}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={recoveryForm.incident_description}
                      onChange={(e) => setRecoveryForm((prev) => ({ ...prev, incident_description: e.target.value }))}
                      placeholder="Incident summary"
                      className="h-10 md:col-span-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recoveryForm.amount_lost}
                      onChange={(e) => setRecoveryForm((prev) => ({ ...prev, amount_lost: e.target.value }))}
                      placeholder="Amount lost"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <input
                      type="date"
                      value={recoveryForm.transaction_date}
                      onChange={(e) => setRecoveryForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRecoveryReport}
                      disabled={isGuardianLoading}
                      className={`${primaryButtonClass} bg-primary hover:opacity-90 text-primary-foreground disabled:opacity-60`}
                    >
                      Generate AI Evidence
                    </button>
                  </div>

                  {recoveryReportId && (
                    <p className="text-xs font-semibold text-[#1D4ED8]">Recovery report ID: {recoveryReportId}</p>
                  )}

                  {recoveryReport && (
                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1D4ED8]">AI Evidence Report Ready</p>
                          <p className="text-xs text-muted-foreground">Generated: {new Date(recoveryReport.generated_at).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={downloadRecoveryReport}
                          className={`${primaryButtonClass} border border-input bg-background text-foreground`}
                        >
                          Download JSON
                        </button>
                      </div>

                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground">Incident Summary</p>
                        <p className="mt-1 text-sm text-foreground">{recoveryReport.incident_summary.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Fraud Type: {recoveryReport.incident_summary.fraud_type} | Confidence: {Math.round(recoveryReport.incident_summary.confidence_level * 100)}%
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground">Evidence Findings</p>
                        <div className="mt-2 flex flex-col gap-2">
                          {recoveryReport.evidence.map((item, idx) => (
                            <div key={`${item.category}-${idx}`} className="text-xs text-muted-foreground">
                              <p className="font-semibold text-foreground">{item.category} ({item.severity})</p>
                              <p>{item.findings}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground">Recovery Steps</p>
                        <div className="mt-2 flex flex-col gap-1">
                          {recoveryReport.recovery_recommendations.map((step, idx) => (
                            <p key={`${step}-${idx}`} className="text-xs text-muted-foreground">{idx + 1}. {step}</p>
                          ))}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#1D4ED8]">Next: {recoveryReport.next_steps}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {guardianStatus && (
              <div className="rounded-lg border border-border bg-accent px-4 py-3 text-sm text-foreground">
                {guardianStatus}
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
              <ShieldAlert size={18} className="text-[#F59E0B]" />
              <span className="text-muted-foreground text-sm">Profile and card changes are simulated locally for demo mode (no external banking API call).</span>
            </div>
          </section>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-[400px] bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-black/20 dark:border-white/20 rounded-3xl p-8 flex flex-col items-center gap-6">
            <h2 className="text-[#111827] dark:text-white text-2xl font-bold font-['Sora'] text-center">Set Wallet PIN</h2>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] text-sm text-center">Create a 6-digit PIN to authorize future transfers.</p>
            
            <div className="flex justify-center gap-4 py-4">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-colors ${i < newPin.length ? 'bg-[#FF5500]' : 'bg-black/10 dark:bg-white/10'}`} 
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (newPin.length < 6) {
                      const updated = newPin + num;
                      setNewPin(updated);
                      if (updated.length === 6) {
                        setTimeout(() => {
                           localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin-value`, updated);
                           localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin`, 'true');
                           setWalletPinEnabled(true);
                           setShowPinSetupModal(false);
                           setSaveMessage('Wallet PIN secure code enabled.');
                           setTimeout(() => setSaveMessage(''), 2500);
                        }, 300);
                      }
                    }
                  }}
                  className="h-14 rounded-2xl bg-[#F8FAFC] dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 text-[#111827] dark:text-white font-bold text-xl transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setShowPinSetupModal(false)}
                className="h-14 rounded-2xl bg-transparent text-[#6B7280] dark:text-[#8A8A8A] font-semibold text-sm transition-all flex items-center justify-center cursor-pointer hover:text-[#111827] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newPin.length < 6) {
                    const updated = newPin + '0';
                    setNewPin(updated);
                    if (updated.length === 6) {
                      setTimeout(() => {
                         localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin-value`, updated);
                         localStorage.setItem(`${PROFILE_STORAGE_KEY}-pin`, 'true');
                         setWalletPinEnabled(true);
                         setShowPinSetupModal(false);
                         setSaveMessage('Wallet PIN secure code enabled.');
                         setTimeout(() => setSaveMessage(''), 2500);
                      }, 300);
                    }
                  }
                }}
                className="h-14 rounded-2xl bg-[#F8FAFC] dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 text-[#111827] dark:text-white font-bold text-xl transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              >
                0
              </button>
              <button 
                onClick={() => setNewPin(prev => prev.slice(0, -1))}
                className="h-14 rounded-2xl bg-transparent text-[#6B7280] dark:text-[#8A8A8A] hover:text-[#111827] dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
