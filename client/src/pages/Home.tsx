import React, { useState, useEffect } from 'react';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import RiskGauge from '@/components/RiskGauge';
import AnomalyChart from '@/components/AnomalyChart';
import APIConsole from '@/components/APIConsole';
import TransactionTable from '@/components/TransactionTable';

/**
 * Dashboard Page - Digital Trust Fraud Shield Analytics
 * 
 * Design Philosophy: Modern FinTech with warm orange accents
 * - Asymmetric Bento Grid layout (4-column, variable height)
 * - Frosted glassmorphism panels with orange accents
 * - Real-time risk scoring and anomaly detection
 * - Cinematic lighting with soft orange glows
 */

export default function Dashboard() {
  const [riskScore, setRiskScore] = useState(67);
  const [anomalyData, setAnomalyData] = useState([
    { time: '00:00', value: 12 },
    { time: '04:00', value: 18 },
    { time: '08:00', value: 25 },
    { time: '12:00', value: 42 },
    { time: '16:00', value: 58 },
    { time: '20:00', value: 67 },
    { time: '24:00', value: 52 },
  ]);

  const [transactionData, setTransactionData] = useState([
    { time: '14:32', value: 15 },
    { time: '14:33', value: 22 },
    { time: '14:34', value: 35 },
    { time: '14:35', value: 48 },
    { time: '14:36', value: 62 },
    { time: '14:37', value: 58 },
  ]);

  // Simulate real-time risk score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRiskScore((prev) => {
        const change = Math.random() * 20 - 10;
        return Math.max(0, Math.min(100, prev + change));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0d0a] overflow-hidden">
      {/* Background with warm orange glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Orange glow - top left */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.3), transparent)',
          }}
        />
        {/* Golden orange glow - bottom right */}
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(247, 147, 30, 0.3), transparent)',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-[rgba(255,107,53,0.1)] bg-[rgba(26,20,16,0.8)] backdrop-blur-md mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-sora">
                Fraud Detection
                <span className="text-primary ml-2">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Real-Time AI-Powered Risk Analysis & Monitoring
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">System Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Bento Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
          {/* 1. Risk Gauge - Large (2x2 on desktop) */}
          <GlassmorphicCard
            className="lg:col-span-2 lg:row-span-2 animate-slide-in-up"
            glowColor="orange"
          >
            <div className="h-[400px] md:h-[350px]">
              <RiskGauge riskScore={riskScore} label="Current Risk Score" />
            </div>
          </GlassmorphicCard>

          {/* 2. Anomaly Detection Chart - Medium (2x1 on desktop) */}
          <GlassmorphicCard
            className="lg:col-span-2 animate-slide-in-up"
            style={{ animationDelay: '0.1s' }}
            glowColor="orange"
          >
            <div className="p-6 h-[200px] md:h-[180px]">
              <AnomalyChart
                data={anomalyData}
                title="Anomaly Detection Trend"
                color="magenta"
                height={120}
              />
            </div>
          </GlassmorphicCard>

          {/* 3. Transaction Volume Chart - Medium (2x1 on desktop) */}
          <GlassmorphicCard
            className="lg:col-span-2 animate-slide-in-up"
            style={{ animationDelay: '0.2s' }}
            glowColor="orange"
          >
            <div className="p-6 h-[200px] md:h-[180px]">
              <AnomalyChart
                data={transactionData}
                title="Transaction Volume"
                color="cyan"
                height={120}
              />
            </div>
          </GlassmorphicCard>

          {/* 4. API Console - Large (2x2 on desktop) */}
          <GlassmorphicCard
            className="lg:col-span-2 lg:row-span-2 animate-slide-in-up"
            style={{ animationDelay: '0.3s' }}
            glowColor="orange"
          >
            <div className="h-[400px] md:h-[350px]">
              <APIConsole title="Risk API Console" />
            </div>
          </GlassmorphicCard>

          {/* 5. Recent Activity Table - Full width (4x2 on desktop) */}
          <GlassmorphicCard
            className="lg:col-span-4 animate-slide-in-up"
            style={{ animationDelay: '0.4s' }}
            glowColor="orange"
          >
            <div className="p-6 h-[320px] md:h-[280px]">
              <TransactionTable title="Recent Activity" />
            </div>
          </GlassmorphicCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(255,107,53,0.1)] bg-[rgba(26,20,16,0.8)] backdrop-blur-md mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          <p>Digital Trust Fraud Shield © 2026 | Real-Time Fraud Detection Engine</p>
        </div>
      </footer>

      {/* Global Styles */}
      <style>{`
        .font-sora {
          font-family: 'Sora', sans-serif;
        }
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 217, 255, 0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 255, 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
