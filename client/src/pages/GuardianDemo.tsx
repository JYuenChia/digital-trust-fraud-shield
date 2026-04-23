import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ShieldAlert, RefreshCw, ArrowLeft, User } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

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

type PendingApproval = {
  approval_id: string;
  sender_account: string;
  sender_name: string;
  guardians: string[];
  risk_score: number;
  reason: string;
  source: string;
  transaction_summary: {
    amount: number;
    currency: string;
    recipient: string;
    provider: string;
    merchant_id: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

const SENIOR_ACCOUNT = 'ALEX8899';

export default function GuardianDemo() {
  const { t } = useLanguage();
  const [guardians, setGuardians] = useState<GuardianContact[]>([]);
  const [selectedGuardianAccount, setSelectedGuardianAccount] = useState('');
  const [alerts, setAlerts] = useState<GuardianAlertsResponse['notifications']>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selectedGuardian = useMemo(
    () => guardians.find((g) => g.guardian_account === selectedGuardianAccount),
    [guardians, selectedGuardianAccount],
  );

  const loadGuardians = async () => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardians/${SENIOR_ACCOUNT}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadGuardians'));
    const data = await response.json();
    const nextGuardians: GuardianContact[] = data.guardians ?? [];
    setGuardians(nextGuardians);
    if (nextGuardians.length > 0) {
      // Prioritize an accepted guardian if one is already selected or default to the first accepted one
      const accepted = nextGuardians.filter(g => g.status === 'ACCEPTED');
      if (accepted.length > 0) {
        setSelectedGuardianAccount(prev => {
          const stillExists = accepted.find(g => g.guardian_account === prev);
          return stillExists ? prev : accepted[0].guardian_account;
        });
      } else {
        setSelectedGuardianAccount(nextGuardians[0].guardian_account);
      }
    }
  };

  const loadAlerts = async (guardianAccount: string) => {
    if (!guardianAccount) {
      setAlerts([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-notifications/${guardianAccount}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadNotifications'));
    const data: GuardianAlertsResponse = await response.json();
    setAlerts(data.notifications ?? []);
  };

  const loadPendingApprovals = async (guardianAccount: string) => {
    if (!guardianAccount) {
      setPendingApprovals([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-pending-approvals/${guardianAccount}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadPending'));
    const data = await response.json();
    setPendingApprovals((data.approvals ?? []) as PendingApproval[]);
  };

  const decideApproval = async (approvalId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!selectedGuardianAccount) return;
    try {
      setDecisionBusyId(approvalId);
      setStatus(null);
      const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-pending-approvals/${approvalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_account: selectedGuardianAccount,
          decision,
          note: decision === 'APPROVE' ? t('guardian.noteApprove') : t('guardian.noteReject'),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || t('guardian.errorRecordDecision'));
      }
      toast.success(decision === 'APPROVE' ? t('guardian.approvedByGuardian') : t('guardian.rejectedByGuardian'));
      await loadPendingApprovals(selectedGuardianAccount);
      await loadAlerts(selectedGuardianAccount);
    } catch (error: any) {
      toast.error(error.message || t('guardian.errorRecordDecision'));
    } finally {
      setDecisionBusyId(null);
    }
  };

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      await loadGuardians();
    } catch {
      setStatus(t('guardian.errorLoadDataNow'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedGuardianAccount) return;
    Promise.all([
      loadAlerts(selectedGuardianAccount),
      loadPendingApprovals(selectedGuardianAccount),
    ]).catch(() => {
      setStatus(t('guardian.errorLoadNotificationsNow'));
    });
  }, [selectedGuardianAccount]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-foreground font-sans flex flex-col items-center pt-16">
      <div className="w-full max-w-[1480px] px-8 py-10 pb-16 flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <ShieldAlert size={28} className="text-[#FF5500]" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-900 font-['Sora'] text-4xl font-bold">{t('guardian.title')}</h1>
              <p className="text-gray-500 text-lg">{t('guardian.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <button type="button" className="h-11 rounded-[8px] border border-[#D1D5DB] bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all">
                <ArrowLeft size={16} /> {t('guardian.backToProfile')}
              </button>
            </Link>
            <button
              type="button"
              onClick={() => {
                loadAlerts(selectedGuardianAccount);
                loadPendingApprovals(selectedGuardianAccount);
              }}
              disabled={!selectedGuardianAccount}
              className="h-11 rounded-[8px] bg-[#FF5500] px-5 text-sm font-semibold text-white hover:bg-[#E64D00] flex items-center gap-2 shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> {t('guardian.refresh')}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-[12px] shadow-sm border border-[#E5E7EB] overflow-hidden">
          <aside className="lg:w-72 lg:shrink-0 bg-transparent border-r border-[#F3F4F6]">
            <nav className="flex lg:flex-col p-4 gap-1">
              <button
                type="button"
                className="h-11 rounded-[8px] px-4 text-sm font-medium text-left transition-all bg-orange-50 text-orange-600"
              >
                Notification Feed
              </button>
              <Link href="/profile" className="w-full">
                <button
                  type="button"
                  className="h-11 rounded-[8px] px-4 text-sm font-medium text-left transition-all text-gray-600 hover:bg-gray-50 w-full"
                >
                  Guardian Link Settings
                </button>
              </Link>
            </nav>
          </aside>

          <section className="flex-1 p-8 md:p-10 flex flex-col gap-8 bg-white min-h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-8">
                {/* Guardian Account Selection */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Guardian Account</h3>
                  <select
                    value={selectedGuardianAccount}
                    onChange={(e) => setSelectedGuardianAccount(e.target.value)}
                    className="h-12 w-full rounded-[8px] border border-[#D1D5DB] bg-[#F9FAFB] px-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all"
                  >
                    <option value="">{t('guardian.chooseGuardian')}</option>
                    {guardians.map((g) => (
                      <option key={g.guardian_account + g.email} value={g.guardian_account}>
                        {g.guardian_name} ({g.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Guardian Details */}
                <div className="rounded-[8px] border border-[#F3F4F6] bg-[#F9FAFB] p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-3">
                    <User size={18} className="text-orange-500" />
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Selected Guardian</h3>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900">{selectedGuardian?.guardian_name || t('guardian.notSelected')}</p>
                      {selectedGuardian && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedGuardian.status === 'ACCEPTED' ? 'bg-green-50 text-green-600 border-green-100' :
                          selectedGuardian.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {selectedGuardian.status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <p className="text-sm text-gray-500 font-medium">{selectedGuardian?.email || t('guardian.noEmail')}</p>
                    </div>
                  </div>
                </div>

                {/* Live Alert Inbox */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Live Alert Inbox</h3>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-600 border border-orange-100">
                      {t('guardian.alertCount').replace('{count}', String(alerts.length))}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[460px] overflow-auto pr-2 custom-scrollbar">
                    {alerts.length === 0 && (
                      <div className="bg-gray-50 border border-dashed border-[#E5E7EB] rounded-[8px] p-8 text-center">
                        <p className="text-sm text-gray-400 italic">{t('guardian.noHighRiskAlerts')}</p>
                      </div>
                    )}

                    {alerts.map((alert, idx) => (
                      <div key={`${alert.timestamp}-${idx}`} className="rounded-[8px] border border-[#F3F4F6] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-[6px] uppercase tracking-tight">
                            {Math.round((alert.risk_score || 0) * 100)}% {t('guardian.risk')}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{alert.type.replaceAll('_', ' ')}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">{alert.sender_name}</p>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">{alert.risk_reason}</p>
                        <div className="mt-3 pt-3 border-t border-[#F9FAFB] text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Pending Transactions */}
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Waiting for Approval</h3>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-600 border border-orange-100">
                    {t('guardian.pendingCount').replace('{count}', String(pendingApprovals.filter((item) => item.status === 'PENDING').length))}
                  </span>
                </div>

                <div className="flex flex-col gap-4 max-h-[800px] overflow-auto pr-2 custom-scrollbar">
                  {pendingApprovals.length === 0 && (
                    <div className="bg-gray-50 border border-dashed border-[#E5E7EB] rounded-[8px] p-8 text-center">
                      <p className="text-sm text-gray-400 italic">{t('guardian.noPending')}</p>
                    </div>
                  )}

                  {pendingApprovals.map((item) => (
                    <div key={item.approval_id} className="rounded-[8px] border border-[#F3F4F6] bg-white p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-gray-900">{item.sender_name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              {Math.round((item.risk_score || 0) * 100)}% {t('guardian.risk')}
                            </span>
                             <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight ${
                               item.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                               item.status === 'APPROVED' ? 'bg-green-50 text-green-600 border border-green-100' : 
                               'bg-red-50 text-red-600 border border-red-100'
                             }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">{item.transaction_summary.currency} {item.transaction_summary.amount}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{t('guardian.to')} {item.transaction_summary.recipient}</p>
                        </div>
                      </div>

                      <div className="bg-[#F9FAFB] rounded-[8px] p-4 text-xs text-gray-600 font-medium leading-relaxed border border-[#F3F4F6]">
                        {item.reason}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>{t('guardian.approvalId')}: {item.approval_id}</span>
                          <span className="text-orange-600">{t('guardian.expires')}: {new Date(item.expires_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {item.status === 'PENDING' && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => decideApproval(item.approval_id, 'APPROVE')}
                            disabled={decisionBusyId === item.approval_id}
                            className="h-10 rounded-[8px] bg-green-600 px-4 text-xs font-bold text-white hover:bg-green-700 shadow-sm active:scale-95 transition-all disabled:opacity-60"
                          >
                            {t('guardian.approveTransaction')}
                          </button>
                          <button
                            type="button"
                            onClick={() => decideApproval(item.approval_id, 'REJECT')}
                            disabled={decisionBusyId === item.approval_id}
                            className="h-10 rounded-[8px] bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 shadow-sm active:scale-95 transition-all disabled:opacity-60"
                          >
                            {t('guardian.rejectForSafety')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {status && (
              <div className="mt-8 px-6 py-4 rounded-[8px] bg-gray-50 border border-[#E5E7EB] text-sm text-gray-600 font-medium flex items-center gap-3 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                {status}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
