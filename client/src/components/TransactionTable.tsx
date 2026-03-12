import React from 'react';

interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  status: 'approved' | 'flagged' | 'blocked';
  riskScore: number;
  merchant: string;
}

interface TransactionTableProps {
  transactions?: Transaction[];
  title?: string;
}

/**
 * TransactionTable Component
 * 
 * Design Philosophy: Ethereal Cyberpunk Minimalism
 * - Minimal table with glassmorphic rows
 * - Color-coded status indicators
 * - Smooth hover effects with glow
 * - Real-time transaction data display
 */
export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions = [
    { id: 'TXN001', timestamp: '14:32:15', amount: 245.50, status: 'approved', riskScore: 12, merchant: 'Amazon' },
    { id: 'TXN002', timestamp: '14:31:42', amount: 1250.00, status: 'flagged', riskScore: 58, merchant: 'Wire Transfer' },
    { id: 'TXN003', timestamp: '14:30:08', amount: 89.99, status: 'approved', riskScore: 5, merchant: 'Starbucks' },
    { id: 'TXN004', timestamp: '14:28:33', amount: 5000.00, status: 'blocked', riskScore: 92, merchant: 'Crypto Exchange' },
    { id: 'TXN005', timestamp: '14:27:19', amount: 156.75, status: 'approved', riskScore: 18, merchant: 'Netflix' },
  ],
  title = 'Recent Activity',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-[rgba(0,255,136,0.1)]', text: 'text-[#00ff88]', border: 'border-[rgba(0,255,136,0.2)]' };
      case 'flagged':
        return { bg: 'bg-[rgba(255,215,0,0.1)]', text: 'text-[#ffd700]', border: 'border-[rgba(255,215,0,0.2)]' };
      case 'blocked':
        return { bg: 'bg-[rgba(255,0,110,0.1)]', text: 'text-[#ff006e]', border: 'border-[rgba(255,0,110,0.2)]' };
      default:
        return { bg: 'bg-transparent', text: 'text-foreground', border: 'border-transparent' };
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-[#00ff88]'; // Green
    if (score < 60) return 'text-[#ffd700]'; // Yellow
    return 'text-[#ff006e]'; // Magenta
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
        <div className="h-0.5 w-12 mt-2 rounded-full bg-[#00d9ff]" />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[rgba(15,23,42,0.8)] border-b border-[rgba(0,217,255,0.1)]">
            <tr>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium">ID</th>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium">Time</th>
              <th className="px-3 py-2 text-right text-muted-foreground font-medium">Amount</th>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium">Merchant</th>
              <th className="px-3 py-2 text-center text-muted-foreground font-medium">Risk</th>
              <th className="px-3 py-2 text-center text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {transactions.map((txn) => {
              const statusColor = getStatusColor(txn.status);
              return (
                <tr
                  key={txn.id}
                  className={`
                    border border-[rgba(0,217,255,0.05)] rounded
                    hover:bg-[rgba(0,217,255,0.05)] hover:border-[rgba(0,217,255,0.2)]
                    transition-all duration-200 cursor-pointer
                  `}
                >
                  <td className="px-3 py-2 text-foreground font-mono">{txn.id}</td>
                  <td className="px-3 py-2 text-muted-foreground">{txn.timestamp}</td>
                  <td className="px-3 py-2 text-right text-foreground font-semibold">
                    ${txn.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-foreground">{txn.merchant}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${getRiskColor(txn.riskScore)}`}>
                    {txn.riskScore}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`
                        inline-block px-2 py-1 rounded text-xs font-semibold
                        ${statusColor.bg} ${statusColor.text} ${statusColor.border} border
                      `}
                    >
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
