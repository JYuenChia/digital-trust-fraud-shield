import React, { useEffect, useState } from 'react';

interface RiskGaugeProps {
  riskScore: number; // 0-100
  label?: string;
}

/**
 * RiskGauge Component
 * 
 * Design Philosophy: Ethereal Cyberpunk Minimalism
 * - Circular progress indicator with animated needle
 * - Pulsing neon glow effect
 * - Color transitions: Green (safe) → Yellow → Red (high risk)
 * - Smooth animation on mount and score changes
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({
  riskScore,
  label = 'Risk Score',
}) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Animate score from 0 to final value
    const interval = setInterval(() => {
      setDisplayScore((prev) => {
        if (prev < riskScore) {
          return Math.min(prev + 2, riskScore);
        }
        return prev;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [riskScore]);

  // Determine color based on risk level
  const getGaugeColor = (score: number) => {
    if (score < 30) return '#00d9ff'; // Cyan - Safe
    if (score < 60) return '#ffd700'; // Yellow - Medium
    return '#ff006e'; // Magenta - High Risk
  };

  const gaugeColor = getGaugeColor(displayScore);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full">
      {/* Glow background effect */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${gaugeColor}40, transparent)`,
        }}
      />

      {/* SVG Gauge */}
      <svg width="200" height="200" viewBox="0 0 200 200" className="relative z-10">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="45"
          fill="none"
          stroke="rgba(0, 217, 255, 0.1)"
          strokeWidth="8"
        />

        {/* Progress circle with glow */}
        <circle
          cx="100"
          cy="100"
          r="45"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out drop-shadow-lg"
          style={{
            filter: `drop-shadow(0 0 10px ${gaugeColor}80)`,
          }}
        />

        {/* Center circle */}
        <circle
          cx="100"
          cy="100"
          r="20"
          fill="#0a0e27"
          stroke={gaugeColor}
          strokeWidth="2"
          style={{
            filter: `drop-shadow(0 0 8px ${gaugeColor}60)`,
          }}
        />

        {/* Score text */}
        <text
          x="100"
          y="108"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={gaugeColor}
          className="font-space-grotesk"
        >
          {displayScore}
        </text>
      </svg>

      {/* Label */}
      <div className="mt-6 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {displayScore < 30 && 'Low Risk - Safe'}
          {displayScore >= 30 && displayScore < 60 && 'Medium Risk - Monitor'}
          {displayScore >= 60 && 'High Risk - Alert'}
        </p>
      </div>

      {/* Pulsing glow animation */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px ${gaugeColor}40);
          }
          50% {
            filter: drop-shadow(0 0 30px ${gaugeColor}60);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default RiskGauge;
