import React from 'react';
import { CreditCard, ShieldAlert, BarChart3, Clock, TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, ShieldX, Map, Activity, PieChart, ShieldCheck } from 'lucide-react';
import { useFraudEvents } from '@/contexts/FraudEventsContext';

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const riskLabel = (score: number) => {
  if (score >= 0.8) return 'High';
  if (score >= 0.45) return 'Medium';
  return 'Low';
};

export default function Dashboard() {
  const { events, clearEvents } = useFraudEvents();

  const totalTransactions = events.length;
  const blockedCount = events.filter((e) => e.status === 'BLOCKED').length;
  const flaggedCount = events.filter((e) => e.status === 'FLAGGED').length;
  const fraudRate = totalTransactions > 0
    ? ((blockedCount + flaggedCount) / totalTransactions) * 100
    : 0;
  const avgRisk = totalTransactions > 0
    ? events.reduce((sum, e) => sum + e.riskScore, 0) / totalTransactions
    : 0;

  const lowRiskCount = events.filter((e) => e.riskScore < 0.45).length;
  const mediumRiskCount = events.filter((e) => e.riskScore >= 0.45 && e.riskScore < 0.8).length;
  const highRiskCount = events.filter((e) => e.riskScore >= 0.8).length;
  const maxBucket = Math.max(lowRiskCount, mediumRiskCount, highRiskCount, 1);

  const alerts = events.filter((e) => e.status !== 'APPROVED').slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      
      {/* Background Gradients (Glossy Bloom) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.50] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.05] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1444px] relative z-10 px-10 py-10 flex flex-col gap-10">
        
        {/* Top Stats Row */}
        <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
          {/* Stat Card 1 */}
          <div className="bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm font-semibold tracking-wider">TOTAL TRANSACTIONS</span>
              <CreditCard size={20} className="text-[#9CA3AF] dark:text-[#525252]" />
            </div>
            <div className="text-[#111827] dark:text-white font-['Sora'] text-4xl font-bold">{totalTransactions}</div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#FF5500]" />
              <span className="text-[#FF5500] text-sm font-semibold">Live from transaction simulator</span>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm font-semibold tracking-wider">BLOCKED FRAUD</span>
              <ShieldAlert size={20} className="text-[#9CA3AF] dark:text-[#525252]" />
            </div>
            <div className="text-[#111827] dark:text-white font-['Sora'] text-4xl font-bold">{blockedCount}</div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-[#FF3B30]" />
              <span className="text-[#FF3B30] text-sm font-semibold">{flaggedCount} flagged pending review</span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm font-semibold tracking-wider">FRAUD RATE</span>
              <BarChart3 size={20} className="text-[#9CA3AF] dark:text-[#525252]" />
            </div>
            <div className="text-[#111827] dark:text-white font-['Sora'] text-4xl font-bold">{fraudRate.toFixed(1)}%</div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#FF3B30]" />
              <span className="text-[#FF3B30] text-sm font-semibold">Flagged + blocked / total</span>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280] dark:text-[#8A8A8A] text-sm font-semibold tracking-wider">AVG REVIEW TIME</span>
              <Clock size={20} className="text-[#9CA3AF] dark:text-[#525252]" />
            </div>
            <div className="text-[#111827] dark:text-white font-['Sora'] text-4xl font-bold">{Math.round(avgRisk * 100)}%</div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-[#FF5500]" />
              <span className="text-[#FF5500] text-sm font-semibold">Average final risk score</span>
            </div>
          </div>
        </div>

        {/* Mid Row: Charts & Alerts */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Chart Card */}
          <div className="flex-[2] bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <span className="text-[#111827] dark:text-white font-['Sora'] font-semibold tracking-wider">RISK SCORE DISTRIBUTION</span>
              <ArrowUpRight size={20} className="text-[#6B7280] dark:text-[#8A8A8A]" />
            </div>
            <div className="w-full h-64 bg-[#F8FAFC] dark:bg-[#141414] rounded-lg border border-black/5 dark:border-white/5 p-6 flex items-end justify-between gap-4">
              {[
                { key: 'Low', value: lowRiskCount, color: 'bg-[#32D74B]' },
                { key: 'Medium', value: mediumRiskCount, color: 'bg-[#FF9F0A]' },
                { key: 'High', value: highRiskCount, color: 'bg-[#FF3B30]' },
              ].map((bucket) => (
                <div key={bucket.key} className="flex-1 flex flex-col items-center gap-3">
                  <div className="text-[#6B7280] dark:text-[#8A8A8A] text-xs">{bucket.value}</div>
                  <div className="h-40 w-full flex items-end">
                    <div
                      className={`${bucket.color} w-full rounded-md`}
                      style={{ height: `${(bucket.value / maxBucket) * 100}%` }}
                    />
                  </div>
                  <div className="text-[#111827] dark:text-white text-xs font-semibold">{bucket.key}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Card */}
          <div data-tour="dashboard-alerts" className="flex-[1] bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <span className="text-[#111827] dark:text-white font-['Sora'] font-semibold tracking-wider">REAL-TIME ALERTS</span>
              <div className="bg-[#FF3B30]/20 px-3 py-1 rounded-full text-[#FF3B30] text-xs font-bold w-fit">{alerts.length} NEW</div>
            </div>
            
            <div className="flex flex-col gap-4">
              {alerts.length === 0 && (
                <div className="text-[#6B7280] dark:text-[#8A8A8A] text-sm">No alerts yet. Run a flagged or blocked transaction to populate this panel.</div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className="flex gap-4 items-start bg-[#F8FAFC] dark:bg-[#141414] p-4 rounded-lg border border-black/5 dark:border-white/5">
                  <div className={`${alert.status === 'BLOCKED' ? 'bg-[#FF3B30]/10' : 'bg-[#FF9F0A]/10'} p-2 rounded-lg`}>
                    <AlertTriangle size={20} className={alert.status === 'BLOCKED' ? 'text-[#FF3B30]' : 'text-[#FF9F0A]'} />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[#111827] dark:text-white font-semibold text-sm font-['Sora']">{alert.status} ({Math.round(alert.riskScore * 100)}%)</span>
                      <span className="text-[#6B7280] dark:text-[#8A8A8A] text-xs">{formatRelativeTime(alert.timestamp)}</span>
                    </div>
                    <span className="text-[#6B7280] dark:text-[#8A8A8A] text-xs leading-relaxed">{alert.reasonCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="w-full bg-[#FFFFFF]/50 dark:bg-[#1A1A1A]/50 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="text-[#111827] dark:text-white font-['Sora'] font-semibold tracking-wider">RECENT TRANSACTIONS</span>
            <button onClick={clearEvents} className="text-[#FF5500] text-sm font-semibold border border-[#FF5500]/30 px-4 py-2 rounded-lg hover:bg-[#FF5500]/10 transition-colors">
              Clear Demo Data
            </button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-[#6B7280] dark:text-[#8A8A8A] text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-4 px-4 font-normal">Transaction ID</th>
                  <th className="pb-4 px-4 font-normal">User</th>
                  <th className="pb-4 px-4 font-normal">Amount</th>
                  <th className="pb-4 px-4 font-normal">Date & Time</th>
                  <th className="pb-4 px-4 font-normal">Risk Score</th>
                  <th className="pb-4 px-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {events.slice(0, 6).map((evt, idx) => (
                  <tr key={evt.id} className={`${idx < events.slice(0, 6).length - 1 ? 'border-b' : ''} border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                    <td className="py-4 px-4 text-[#111827] dark:text-white font-mono">{evt.id.slice(-10).toUpperCase()}</td>
                    <td className="py-4 px-4 text-[#111827] dark:text-white font-semibold">{evt.user}</td>
                    <td className="py-4 px-4 text-[#111827] dark:text-white font-['Sora'] font-semibold">{formatCurrency(evt.amount, evt.currency)}</td>
                    <td className="py-4 px-4 text-[#6B7280] dark:text-[#8A8A8A]">{new Date(evt.timestamp).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`${evt.status === 'BLOCKED' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : evt.status === 'FLAGGED' ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]' : 'bg-[#32D74B]/10 text-[#32D74B]'} px-2 py-1 rounded font-bold`}>{Math.round(evt.riskScore * 100)} ({riskLabel(evt.riskScore)})</span>
                    </td>
                    <td className="py-4 px-4">
                      {evt.status === 'BLOCKED' && (
                        <span className="flex items-center gap-1 text-[#FF3B30]">
                          <ShieldX size={14} /> Blocked
                        </span>
                      )}
                      {evt.status === 'FLAGGED' && (
                        <span className="flex items-center gap-1 text-[#FF9F0A]">
                          <AlertTriangle size={14} /> Flagged
                        </span>
                      )}
                      {evt.status === 'APPROVED' && (
                        <span className="flex items-center gap-1 text-[#32D74B]">
                          <ShieldCheck size={14} /> Approved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-[#6B7280] dark:text-[#8A8A8A] text-center">No transactions yet. Submit a transaction from the Transaction page to populate this dashboard.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
