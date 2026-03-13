import React from 'react';
import { CreditCard, ShieldAlert, BarChart3, Clock, TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, ShieldX, Map, Activity, PieChart, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      
      {/* Background Gradients (Glossy Bloom) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.50] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.05] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1444px] relative z-10 px-10 py-10 flex flex-col gap-10">
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
          {/* Stat Card 1 */}
          <div className="bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#8A8A8A] text-sm font-semibold tracking-wider">TOTAL TRANSACTIONS</span>
              <CreditCard size={20} className="text-[#525252]" />
            </div>
            <div className="text-white font-['Sora'] text-4xl font-bold">24,591</div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#FF5500]" />
              <span className="text-[#FF5500] text-sm font-semibold">+12.5% this week</span>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#8A8A8A] text-sm font-semibold tracking-wider">BLOCKED FRAUD</span>
              <ShieldAlert size={20} className="text-[#525252]" />
            </div>
            <div className="text-white font-['Sora'] text-4xl font-bold">842</div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-[#FF3B30]" />
              <span className="text-[#FF3B30] text-sm font-semibold">-4.2% this week</span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#8A8A8A] text-sm font-semibold tracking-wider">FRAUD RATE</span>
              <BarChart3 size={20} className="text-[#525252]" />
            </div>
            <div className="text-white font-['Sora'] text-4xl font-bold">3.4%</div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#FF3B30]" />
              <span className="text-[#FF3B30] text-sm font-semibold">+0.8% this week</span>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[#8A8A8A] text-sm font-semibold tracking-wider">AVG REVIEW TIME</span>
              <Clock size={20} className="text-[#525252]" />
            </div>
            <div className="text-white font-['Sora'] text-4xl font-bold">2.4m</div>
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-[#FF5500]" />
              <span className="text-[#FF5500] text-sm font-semibold">-1.2m this week</span>
            </div>
          </div>
        </div>

        {/* Mid Row: Charts & Alerts */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Chart Card */}
          <div className="flex-[2] bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <span className="text-white font-['Sora'] font-semibold tracking-wider">RISK SCORE DISTRIBUTION</span>
              <ArrowUpRight size={20} className="text-[#8A8A8A]" />
            </div>
            <div className="w-full h-64 bg-[#141414] rounded-lg border border-white/5 flex items-center justify-center">
              <span className="text-[#525252] text-sm">[ Risk Distribution Bar Chart ]</span>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="flex-[1] bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <span className="text-white font-['Sora'] font-semibold tracking-wider">REAL-TIME ALERTS</span>
              <div className="bg-[#FF3B30]/20 px-3 py-1 rounded-full text-[#FF3B30] text-xs font-bold w-fit">4 NEW</div>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Alert 1 */}
              <div className="flex gap-4 items-start bg-[#141414] p-4 rounded-lg border border-white/5">
                <div className="bg-[#FF3B30]/10 p-2 rounded-lg">
                  <AlertTriangle size={20} className="text-[#FF3B30]" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-white font-semibold text-sm font-['Sora']">High Risk Score (98/100)</span>
                    <span className="text-[#8A8A8A] text-xs">Just now</span>
                  </div>
                  <span className="text-[#8A8A8A] text-xs leading-relaxed">Unusual login location from Russia for account #492.</span>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="flex gap-4 items-start bg-[#141414] p-4 rounded-lg border border-white/5">
                <div className="bg-[#FF9F0A]/10 p-2 rounded-lg">
                  <ShieldX size={20} className="text-[#FF9F0A]" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-white font-semibold text-sm font-['Sora']">Multiple Failed Logins</span>
                    <span className="text-[#8A8A8A] text-xs">2m ago</span>
                  </div>
                  <span className="text-[#8A8A8A] text-xs leading-relaxed">15 failed attempts on user admin@fin.com</span>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="flex gap-4 items-start bg-[#141414] p-4 rounded-lg border border-white/5">
                <div className="bg-[#FF5500]/10 p-2 rounded-lg">
                  <Activity size={20} className="text-[#FF5500]" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-white font-semibold text-sm font-['Sora']">Velocity Check Failed</span>
                    <span className="text-[#8A8A8A] text-xs">5m ago</span>
                  </div>
                  <span className="text-[#8A8A8A] text-xs leading-relaxed">5 transactions over $1000 in 1 minute.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="w-full bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="text-white font-['Sora'] font-semibold tracking-wider">RECENT TRANSACTIONS</span>
            <button className="text-[#FF5500] text-sm font-semibold border border-[#FF5500]/30 px-4 py-2 rounded-lg hover:bg-[#FF5500]/10 transition-colors">
              View All
            </button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#8A8A8A] text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-4 px-4 font-normal">Transaction ID</th>
                  <th className="pb-4 px-4 font-normal">User</th>
                  <th className="pb-4 px-4 font-normal">Amount</th>
                  <th className="pb-4 px-4 font-normal">Date & Time</th>
                  <th className="pb-4 px-4 font-normal">Risk Score</th>
                  <th className="pb-4 px-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white font-mono">TXN-8439F</td>
                  <td className="py-4 px-4 text-white font-semibold">Sarah Jenkins</td>
                  <td className="py-4 px-4 text-white font-['Sora'] font-semibold">$1,250.00</td>
                  <td className="py-4 px-4 text-[#8A8A8A]">Oct 12, 14:32</td>
                  <td className="py-4 px-4">
                    <span className="bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-1 rounded font-bold">94 (High)</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-1 text-[#FF3B30]">
                      <ShieldX size={14} /> Blocked
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white font-mono">TXN-4921A</td>
                  <td className="py-4 px-4 text-white font-semibold">Michael Chen</td>
                  <td className="py-4 px-4 text-white font-['Sora'] font-semibold">$45.00</td>
                  <td className="py-4 px-4 text-[#8A8A8A]">Oct 12, 14:28</td>
                  <td className="py-4 px-4">
                    <span className="bg-[#32D74B]/10 text-[#32D74B] px-2 py-1 rounded font-bold">12 (Low)</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-1 text-[#32D74B]">
                      <ShieldCheck size={14} /> Approved
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white font-mono">TXN-1102B</td>
                  <td className="py-4 px-4 text-white font-semibold">Elena Rossi</td>
                  <td className="py-4 px-4 text-white font-['Sora'] font-semibold">$3,400.00</td>
                  <td className="py-4 px-4 text-[#8A8A8A]">Oct 12, 14:15</td>
                  <td className="py-4 px-4">
                    <span className="bg-[#FF9F0A]/10 text-[#FF9F0A] px-2 py-1 rounded font-bold">58 (Medium)</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-1 text-[#FF9F0A]">
                      <AlertTriangle size={14} /> Flagged
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="w-full bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-xl p-6 flex flex-col gap-6 mb-12">
          <span className="text-white font-['Sora'] font-semibold tracking-wider">FRAUD PATTERN ANALYSIS</span>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141414] p-4 flex flex-col gap-4 rounded-lg border border-white/5">
              <span className="text-[#8A8A8A] text-xs font-semibold tracking-wider">BY LOCATION</span>
              <div className="w-full h-32 flex flex-col items-center justify-center gap-2 opacity-50">
                <Map size={32} className="text-[#525252]" />
                <span className="text-[#525252] text-xs">[ Map Visualization ]</span>
              </div>
            </div>
            
            <div className="bg-[#141414] p-4 flex flex-col gap-4 rounded-lg border border-white/5">
              <span className="text-[#8A8A8A] text-xs font-semibold tracking-wider">BY TIME</span>
              <div className="w-full h-32 flex flex-col items-center justify-center gap-2 opacity-50">
                <Activity size={32} className="text-[#525252]" />
                <span className="text-[#525252] text-xs">[ Time Series Line Chart ]</span>
              </div>
            </div>

            <div className="bg-[#141414] p-4 flex flex-col gap-4 rounded-lg border border-white/5">
              <span className="text-[#8A8A8A] text-xs font-semibold tracking-wider">BY PURPOSE</span>
              <div className="w-full h-32 flex flex-col items-center justify-center gap-2 opacity-50">
                <PieChart size={32} className="text-[#525252]" />
                <span className="text-[#525252] text-xs">[ Category Breakdown ]</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
