import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader, CheckCircle, AlertTriangle, Play } from 'lucide-react';

export default function Transaction() {
  const [modalState, setModalState] = useState<'idle' | 'confirming' | 'processing' | 'approved' | 'verification' | 'blocked'>('idle');

  const handleProcessTransaction = () => {
    setModalState('processing');
    setTimeout(() => {
      const outcomes: ('approved' | 'verification' | 'blocked')[] = ['approved', 'verification', 'blocked'];
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      setModalState(randomOutcome);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] font-['Inter'] flex flex-col items-center pt-16">
      
      {/* Background Gradients (Glossy Bloom, Bottom) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.50] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.05] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1510px] relative z-10 px-[40px] py-[40px] pb-[80px] flex justify-center">
        
        {/* Form Container */}
        <div className="w-full max-w-[1315px] bg-[#1A1A1A]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 flex flex-col gap-10">
          
          {/* Title Area */}
          <div className="flex flex-col gap-2">
            <h1 className="text-white font-['Sora'] text-4xl font-bold">Make a Secure Transaction</h1>
            <p className="text-[#8A8A8A] text-lg">Transfer funds safely with AI-powered fraud monitoring.</p>
          </div>

          {/* Sender Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Sender Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Sender Name</span>
                <span className="text-white font-semibold">Alex Tan</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Account Number</span>
                <span className="text-white font-mono text-sm tracking-widest text-[#FF5500]">**** **** 8899</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Available Balance</span>
                <span className="text-white font-semibold font-['Sora']">RM 12,450</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Wallet</span>
                <span className="text-white font-semibold">DemoPay Wallet</span>
              </div>
            </div>
          </div>

          {/* Recipient Information */}
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Recipient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Recipient Name</span>
                <span className="text-white font-semibold">John Lee</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Account Number</span>
                <span className="text-white font-mono text-sm tracking-widest text-[#FF5500]">**** **** 4291</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Wallet Provider</span>
                <span className="text-white font-semibold">SecureBank</span>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-lg font-semibold border-b border-white/10 pb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 bg-[#141414] border border-[#FF5500]/30 shadow-[0_0_15px_rgba(255,85,0,0.1)] p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Transfer Amount</span>
                <span className="text-white font-bold font-['Sora'] text-2xl">2,000.00</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Currency</span>
                <span className="text-white font-semibold">MYR</span>
              </div>
              <div className="flex flex-col gap-2 bg-[#141414] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8A8A8A] text-sm">Transfer Note (Optional)</span>
                <span className="text-white font-semibold italic opacity-50">Rent for January</span>
              </div>
            </div>
          </div>

          {/* Security Indicator */}
          <div className="flex items-center gap-4 bg-[#FFFFFF05] border border-white/10 p-5 rounded-xl">
            <ShieldCheck size={28} className="text-[#32D74B]" />
            <div className="flex flex-col">
              <span className="text-white font-bold">Privacy-First AI Monitor</span>
              <span className="text-[#8A8A8A] text-sm">Device, IP, & behavioral data encrypt-assessed for real-time risk scoring.</span>
            </div>
          </div>

          {/* Button */}
          <button 
            onClick={() => setModalState('confirming')}
            className="w-full bg-[#FF5500] hover:bg-[#E04B00] transition-colors py-5 rounded-xl text-white font-['Sora'] font-bold text-lg mt-4 cursor-pointer"
          >
            Transfer Now
          </button>
        </div>
      </div>

      {/* Modals Flow Container */}
      {modalState !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          
          {/* 1. Confirming Modal */}
          {modalState === 'confirming' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-white/20 rounded-3xl p-8 flex flex-col gap-6">
              <div className="text-[#FF5500]">
                <Play size={32} className="fill-[#FF5500] stroke-none rotate-90" />
              </div>
              <h2 className="text-white text-2xl font-bold font-['Sora']">Confirm Transaction</h2>
              
              <div className="bg-[#FFFFFF05] rounded-xl flex flex-col gap-3 p-4">
                <div className="flex justify-between">
                  <span className="text-[#8A8A8A] text-sm">Pay</span>
                  <span className="text-white font-semibold">RM 2000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8A8A] text-sm">To</span>
                  <span className="text-white font-semibold">John Lee</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setModalState('idle')} className="flex-1 bg-transparent border border-white/20 text-white rounded-lg py-3 font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleProcessTransaction} className="flex-1 bg-[#FF3B30] hover:bg-[#E0352B] transition-colors text-white rounded-lg py-3 font-semibold cursor-pointer">
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* 2. Processing Modal */}
          {modalState === 'processing' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-white/20 rounded-3xl pt-12 pb-12 px-8 flex flex-col items-center gap-6">
              <Loader size={48} className="text-[#FF5500] animate-spin" />
              <h2 className="text-white text-xl font-bold font-['Sora'] text-center">Analyzing transaction risk...</h2>
              <p className="text-[#8A8A8A] text-sm text-center">Running real-time anomaly scoring...</p>
            </div>
          )}

          {/* 3. Approved Modal */}
          {modalState === 'approved' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#32D74B40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#32D74B20] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#32D74B]" />
              </div>
              <h2 className="text-white text-2xl font-bold font-['Sora'] text-center">Status: Approved</h2>
              <div className="bg-[#32D74B15] px-4 py-2 rounded-full">
                <span className="text-[#32D74B] font-semibold text-sm">Risk Score: 23 (Low)</span>
              </div>
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">Transaction verified and completed successfully.</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#32D74B] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#2CBF41]">
                Done
              </button>
            </div>
          )}

          {/* 4. Verification Required */}
          {modalState === 'verification' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#FF9F0A40] rounded-3xl p-8 flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-[#FF9F0A20] flex items-center justify-center">
                <AlertTriangle size={32} className="text-[#FF9F0A]" />
              </div>
              <h2 className="text-white text-[22px] font-bold font-['Sora'] text-center leading-tight">Status: Verification Required</h2>
              <div className="bg-[#FF9F0A15] px-4 py-2 rounded-full">
                <span className="text-[#FF9F0A] font-semibold text-sm">Risk Score: 55 (Medium)</span>
              </div>
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">Unusual activity detected. Please verify your identity to continue.</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#FF9F0A] text-[#111111] rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E68F09]">
                Verify Identity
              </button>
            </div>
          )}

          {/* 5. Transaction Blocked */}
          {modalState === 'blocked' && (
            <div className="w-[400px] bg-[#1A1A1A] border border-[#FF3B30] rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(255,59,48,0.25)]">
              <div className="w-16 h-16 rounded-full bg-[#FF3B3020] flex items-center justify-center">
                <ShieldAlert size={32} className="text-[#FF3B30]" />
              </div>
              <h2 className="text-white text-[22px] font-bold font-['Sora'] text-center">Status: Transaction Blocked</h2>
              <div className="bg-[#FF3B3015] px-4 py-2 rounded-full">
                <span className="text-[#FF3B30] font-semibold text-sm">Risk Score: 88 (High)</span>
              </div>
              <p className="text-[#8A8A8A] text-center leading-relaxed text-[15px]">This transaction has been blocked due to high fraud risk.</p>
              <button onClick={() => setModalState('idle')} className="w-full bg-[#FF3B30] text-white rounded-lg py-4 font-semibold text-[15px] cursor-pointer hover:bg-[#E6352B]">
                Contact Support
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
