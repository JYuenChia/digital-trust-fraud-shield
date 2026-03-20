import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import { FRAUD_API_BASE_URL } from '@/const';

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
    if (!response.ok) throw new Error('Could not load guardians.');
    const data = await response.json();
    const nextGuardians: GuardianContact[] = data.guardians ?? [];
    setGuardians(nextGuardians);
    if (nextGuardians.length > 0) {
      setSelectedGuardianAccount((prev) => prev || nextGuardians[0].guardian_account);
    }
  };

  const loadAlerts = async (guardianAccount: string) => {
    if (!guardianAccount) {
      setAlerts([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-notifications/${guardianAccount}`);
    if (!response.ok) throw new Error('Could not load guardian notifications.');
    const data: GuardianAlertsResponse = await response.json();
    setAlerts(data.notifications ?? []);
  };

  const loadPendingApprovals = async (guardianAccount: string) => {
    if (!guardianAccount) {
      setPendingApprovals([]);
      return;
    }
    const response = await fetch(`${FRAUD_API_BASE_URL}/guardian-pending-approvals/${guardianAccount}`);
    if (!response.ok) throw new Error('Could not load pending approvals.');
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
          note: decision === 'APPROVE' ? 'Approved after guardian review.' : 'Rejected due to scam concern.',
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Unable to record decision.');
      }
      setStatus(decision === 'APPROVE' ? 'Transaction approved by guardian.' : 'Transaction rejected by guardian.');
      await loadPendingApprovals(selectedGuardianAccount);
      await loadAlerts(selectedGuardianAccount);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to record decision.');
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
      setStatus('Unable to load guardian data right now.');
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
      setStatus('Unable to load notifications right now.');
    });
  }, [selectedGuardianAccount]);

  return (
    <div className="min-h-screen bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#2E8BFF] opacity-[0.35] blur-[170px] rounded-[100%] bottom-[-430px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#5DA8FF] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-320px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#2E8BFF] opacity-[0.06] blur-[140px] rounded-[100%] bottom-[-320px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1180px] relative z-10 px-6 md:px-10 py-10 pb-20 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-[#7EC8FF]" />
            <div className="flex flex-col">
              <h1 className="text-white font-['Sora'] text-3xl font-bold">Guardian Notification Feed</h1>
              <p className="text-[#9AB0C8] text-sm">Shows alerts triggered by high-risk transfers or risky QR scans.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                <ArrowLeft size={15} /> Back to Profile
              </button>
            </Link>
            <button
              type="button"
              onClick={() => {
                loadAlerts(selectedGuardianAccount);
                loadPendingApprovals(selectedGuardianAccount);
              }}
              disabled={!selectedGuardianAccount}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5DA8FF] px-3 py-2 text-sm font-semibold text-[#0E1722] hover:bg-[#4B97EA] disabled:opacity-60"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151D29]/75 p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">Guardian Account</label>
              <select
                value={selectedGuardianAccount}
                onChange={(e) => setSelectedGuardianAccount(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#101722] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Choose guardian</option>
                {guardians.map((g) => (
                  <option key={g.guardian_account} value={g.guardian_account}>
                    {g.guardian_name} ({g.guardian_account})
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-[#5DA8FF33] bg-[#5DA8FF12] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8CBCE9]">Current Guardian</p>
              <p className="mt-1 text-sm font-semibold text-white">{selectedGuardian?.guardian_name || 'Not selected'}</p>
              <p className="text-xs text-[#B8CAE0]">{selectedGuardian?.email || 'No email'} • {selectedGuardian?.phone || 'No phone'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#0E1420] p-3">
            <div className="rounded-lg border border-[#5DA8FF44] bg-[#0D1624] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Transactions Waiting for Guardian Decision</p>
                <span className="rounded-full bg-[#5DA8FF22] px-2.5 py-1 text-[11px] font-semibold text-[#CFE7FF]">
                  {pendingApprovals.filter((item) => item.status === 'PENDING').length} pending
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2 max-h-[300px] overflow-auto pr-1">
                {pendingApprovals.length === 0 && (
                  <p className="text-sm text-[#96A7BC]">No pending approvals right now.</p>
                )}

                {pendingApprovals.map((item) => (
                  <div key={item.approval_id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{item.sender_name} • {Math.round((item.risk_score || 0) * 100)}% risk</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === 'PENDING' ? 'bg-[#FF9F0A25] text-[#FFD39F]' : item.status === 'APPROVED' ? 'bg-[#32D74B25] text-[#B9F8C6]' : 'bg-[#FF3B3025] text-[#FFC6C3]'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#D6E4F3]">{item.transaction_summary.currency} {item.transaction_summary.amount} to {item.transaction_summary.recipient}</p>
                    <p className="mt-1 text-xs text-[#BDD2E8]">{item.reason}</p>
                    <p className="mt-1 text-[11px] text-[#9BB0C5]">Approval ID: {item.approval_id}</p>
                    <p className="text-[11px] text-[#8FA7BF]">Expires: {new Date(item.expires_at).toLocaleString()}</p>

                    {item.status === 'PENDING' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => decideApproval(item.approval_id, 'APPROVE')}
                          disabled={decisionBusyId === item.approval_id}
                          className="rounded-lg bg-[#32D74B] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#29C340] disabled:opacity-60"
                        >
                          Approve Transaction
                        </button>
                        <button
                          type="button"
                          onClick={() => decideApproval(item.approval_id, 'REJECT')}
                          disabled={decisionBusyId === item.approval_id}
                          className="rounded-lg bg-[#FF3B30] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E6352B] disabled:opacity-60"
                        >
                          Reject for Safety
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Live Alert Inbox</p>
              <span className="rounded-full bg-[#FF9F0A22] px-2.5 py-1 text-[11px] font-semibold text-[#FFD39F]">
                {alerts.length} alerts
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 max-h-[460px] overflow-auto pr-1">
              {alerts.length === 0 && (
                <p className="text-sm text-[#96A7BC]">No high-risk alerts yet. Trigger a risky transfer or suspicious QR scan to see this feed update.</p>
              )}

              {alerts.map((alert, idx) => (
                <div key={`${alert.timestamp}-${idx}`} className="rounded-lg border border-[#FF8A5538] bg-[#FF8A5512] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{Math.round((alert.risk_score || 0) * 100)}% risk • {alert.sender_name}</p>
                    <span className="rounded-full bg-[#FFFFFF1A] px-2 py-0.5 text-[10px] font-bold text-[#FFD1B0]">{alert.type.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#FFD6BF]">{alert.risk_reason}</p>
                  <p className="mt-1 text-[11px] text-[#BCA99C]">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#7EC8FF44] bg-[#7EC8FF14] px-4 py-3 text-sm text-[#CFEAFF]">
          Page path: /guardian-notifications
        </div>

        {status && (
          <div className="rounded-xl border border-[#FF9F0A44] bg-[#FF9F0A14] px-4 py-3 text-sm text-[#FFD9A8]">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
