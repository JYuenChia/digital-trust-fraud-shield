import React, { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface APIConsoleProps {
  title?: string;
  maxLogs?: number;
}

/**
 * APIConsole Component
 * 
 * Design Philosophy: Ethereal Cyberpunk Minimalism
 * - Terminal-style code console window
 * - Monospace font for authenticity
 * - Color-coded log levels (cyan, green, yellow, magenta)
 * - Animated log entries with blinking cursor
 * - Real-time simulation of API calls
 */
export const APIConsole: React.FC<APIConsoleProps> = ({
  title = 'Risk API Console',
  maxLogs = 8,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Simulate API calls and logs
    const mockLogs = [
      { level: 'info' as const, message: '> Initializing Fraud Detection Engine...' },
      { level: 'success' as const, message: '✓ Model loaded: XGBoost v2.1.4' },
      { level: 'info' as const, message: '> Analyzing transaction patterns...' },
      { level: 'warning' as const, message: '⚠ Anomaly detected: Transaction amount 3.2σ above mean' },
      { level: 'info' as const, message: '> Evaluating behavioral profile...' },
      { level: 'success' as const, message: '✓ Risk Score: 67/100 (HIGH)' },
      { level: 'info' as const, message: '> Contextual data integration...' },
      { level: 'success' as const, message: '✓ API Response: BLOCK_TRANSACTION' },
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < mockLogs.length) {
        const newLog = {
          id: `log-${Date.now()}-${logIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          level: mockLogs[logIndex].level,
          message: mockLogs[logIndex].message,
        };
        setLogs((prev) => [...prev.slice(-maxLogs + 1), newLog]);
        logIndex++;
      } else {
        logIndex = 0;
        setLogs([]);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [maxLogs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return '#F77F00'; // Orange
      case 'success':
        return '#00ff88'; // Green
      case 'warning':
        return '#FCBF49'; // Golden
      case 'error':
        return '#D62828'; // Red
      default:
        return '#f8f9fa';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[rgba(5,29,62,0.9)] rounded-lg border border-[rgba(247,127,0,0.2)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(247,127,0,0.1)] bg-[rgba(5,29,62,0.8)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#F77F00] uppercase tracking-widest font-mono">
            {title}
          </h3>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs text-muted-foreground">LIVE</span>
          </div>
        </div>
      </div>

      {/* Console Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[rgba(5,29,62,0.95)]">
        {logs.length === 0 ? (
          <div className="text-muted-foreground">
            <span className="text-[#F77F00]">&gt;</span> Waiting for transactions...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="animate-fadeIn"
              style={{
                color: getLevelColor(log.level),
                textShadow: `0 0 10px ${getLevelColor(log.level)}40`,
              }}
            >
              <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
              <span>{log.message}</span>
            </div>
          ))
        )}

        {/* Blinking cursor */}
        {isActive && (
          <div className="text-[#F77F00]">
            <span>&gt;</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[rgba(247,127,0,0.1)] bg-[rgba(5,29,62,0.8)] text-xs text-muted-foreground">
        <span className="text-[#F77F00]">fraud-shield@api</span>
        <span>:~$ </span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default APIConsole;
