import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ShieldAlert, RefreshCw, ArrowLeft, User, ArrowRight, X } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type SeniorContact = {
  senior_account: string;
  senior_name: string;
  linked_at: string;
};

type GuardianAlertsResponse = {
  notifications: Array<{
    alert_id: string;
    sender_account: string;
    sender_name: string;
    type: string;
    risk_score: number;
    risk_reason: string;
    transaction_id?: string;
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

const GUARDIAN_EMAIL = 'jyuenchia@gmail.com'; // Hardcoded for demo

export default function GuardianDemo() {
  const { t } = useLanguage();
  const [seniors, setSeniors] = useState<SeniorContact[]>([]);
  const [selectedSeniorAccount, setSelectedSeniorAccount] = useState('');
  const [alerts, setAlerts] = useState<GuardianAlertsResponse['notifications']>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selectedSenior = useMemo(
    () => seniors.find((s) => s.senior_account === selectedSeniorAccount),
    [seniors, selectedSeniorAccount],
  );

  const loadSeniors = async () => {
    const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardians/seniors/${GUARDIAN_EMAIL}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadGuardians'));
    const data = await response.json();
    const nextSeniors: SeniorContact[] = data.seniors ?? [];
    setSeniors(nextSeniors);
    if (nextSeniors.length > 0 && !selectedSeniorAccount) {
      setSelectedSeniorAccount(nextSeniors[0].senior_account);
    }
  };

  const loadAlerts = async (seniorAccount: string) => {
    if (!seniorAccount) {
      setAlerts([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardian-notifications/${seniorAccount}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadNotifications'));
    const data: GuardianAlertsResponse = await response.json();
    setAlerts(data.notifications ?? []);
  };

  const loadPendingApprovals = async (seniorAccount: string) => {
    if (!seniorAccount) {
      setPendingApprovals([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardian-pending-approvals/${seniorAccount}`);
    if (!response.ok) throw new Error(t('guardian.errorLoadPending'));
    const data = await response.json();
    setPendingApprovals((data.approvals ?? []) as PendingApproval[]);
  };

  const decideApproval = async (approvalId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!selectedSeniorAccount) return;
    try {
      setDecisionBusyId(approvalId);
      setStatus(null);
      const response = await fetch(`${FRAUD_API_BASE_URL}/api/guardian-pending-approvals/${approvalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_account: selectedSeniorAccount,
          decision,
          note: decision === 'APPROVE' ? t('guardian.noteApprove') : t('guardian.noteReject'),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || t('guardian.errorRecordDecision'));
      }
      toast.success(decision === 'APPROVE' ? t('guardian.approvedByGuardian') : t('guardian.rejectedByGuardian'));
      await loadPendingApprovals(selectedSeniorAccount);
      await loadAlerts(selectedSeniorAccount);
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
      await loadSeniors();
    } catch {
      setStatus(t('guardian.errorLoadDataNow'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useEffect(() => {
    if (!selectedSeniorAccount) return;
    Promise.all([
      loadAlerts(selectedSeniorAccount),
      loadPendingApprovals(selectedSeniorAccount),
    ]).then(() => {
      toast.success(t('guardian.dataRefreshed'));
    }).catch(() => {
      setStatus(t('guardian.errorLoadNotificationsNow'));
      toast.error(t('guardian.errorRefresh'));
    });
  }, [selectedSeniorAccount]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-foreground font-sans flex flex-col items-center pt-16">
      <div className="w-full max-w-[1480px] px-8 py-10 pb-16 flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <ShieldAlert size={28} className="text-[#FF5500]" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-900 dark:text-white font-['Sora'] text-4xl font-bold">Guardian Hub</h1>
              <p className="text-gray-500 text-lg">Monitoring protected senior accounts.</p>
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
              onClick={async () => {
                setIsLoading(true);
                try {
                  await Promise.all([
                    loadSeniors(),
                    selectedSeniorAccount ? loadAlerts(selectedSeniorAccount) : Promise.resolve(),
                    selectedSeniorAccount ? loadPendingApprovals(selectedSeniorAccount) : Promise.resolve(),
                  ]);
                  toast.success(t('guardian.dataRefreshed'));
                } catch (err) {
                  toast.error(t('guardian.errorRefresh'));
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
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
                {/* Senior Account Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Select Protected Account</label>
                  <select
                    value={selectedSeniorAccount}
                    onChange={(e) => setSelectedSeniorAccount(e.target.value)}
                    className="h-14 w-full md:w-[320px] rounded-xl border border-black/10 bg-white px-5 font-['Sora'] text-lg font-bold text-[#111827] shadow-sm focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 transition-all outline-none"
                  >
                    {seniors.length === 0 && <option value="">No seniors linked</option>}
                    {seniors.map((s) => (
                      <option key={s.senior_account} value={s.senior_account}>
                        {s.senior_name} ({s.senior_account})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Senior Details */}
                <div className="rounded-[8px] border border-[#F3F4F6] bg-[#F9FAFB] p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-3">
                    <User size={18} className="text-orange-500" />
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Selected Senior</h3>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Name:</span>
                      <p className="text-sm font-bold text-gray-900">{selectedSenior?.senior_name || t('guardian.notSelected')}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account ID:</span>
                      <p className="text-sm font-medium text-gray-600">{selectedSenior?.senior_account || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Linked Since:</span>
                      <p className="text-xs font-medium text-gray-500">
                        {selectedSenior?.linked_at ? new Date(selectedSenior.linked_at).toLocaleDateString() : '-'}
                      </p>
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
                      <div key={`${alert.timestamp}-${idx}`} className="group rounded-xl border border-black/5 bg-white p-5 shadow-sm hover:shadow-md hover:border-[#FF5500]/30 transition-all duration-300">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-[6px] uppercase tracking-tight">
                              {Math.round((alert.risk_score || 0) * 100)}% {t('guardian.risk')}
                            </span>
                            {alert.type === 'HIGH_RISK_TRANSACTION' && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{alert.type.replaceAll('_', ' ')}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">{alert.sender_name}</p>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium mb-4 line-clamp-2">{alert.risk_reason}</p>

                        <div className="flex items-center justify-between mt-auto">
                          {alert.transaction_id ? (
                            <button
                              onClick={() => setSelectedTransaction({
                                id: alert.transaction_id,
                                senior: alert.sender_name,
                                reason: alert.risk_reason,
                                score: alert.risk_score,
                                timestamp: alert.timestamp
                              })}
                              className="text-[11px] font-bold text-[#FF5500] hover:text-[#E64D00] flex items-center gap-1 uppercase tracking-wider transition-colors"
                            >
                              View Transaction <ArrowRight size={12} />
                            </button>
                          ) : <div />}

                          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
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
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight ${item.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
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
              <div className="mt-8 px-6 py-4 rounded-xl bg-orange-50 border border-orange-100 text-sm text-orange-800 font-medium flex items-center gap-3 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                {status}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-[500px] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="bg-[#FF5500] p-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Transaction Detail</span>
                <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-3xl font-['Sora'] font-bold mb-1">{selectedTransaction.senior}</h2>
              <p className="text-white/70 text-sm font-medium">Ref ID: {selectedTransaction.id}</p>
            </div>

            <div className="p-8 flex flex-col gap-8">
              <div className="flex items-center justify-between p-6 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">AI Risk Assessment</span>
                  <span className="text-2xl font-bold text-red-700 dark:text-red-400">{Math.round(selectedTransaction.score * 100)}% Threat</span>
                </div>
                <ShieldAlert size={40} className="text-red-500 opacity-80" />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason for Alert</span>
                  <p className="text-[#111827] dark:text-[#E0E0E0] font-medium leading-relaxed italic border-l-4 border-[#FF5500] pl-4">
                    "{selectedTransaction.reason}"
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detection Time</span>
                  <p className="text-[#111827] dark:text-white font-bold">{new Date(selectedTransaction.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full h-14 rounded-2xl bg-[#111827] text-white font-bold hover:bg-black transition-all active:scale-[0.98]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
