import React, { useEffect, useRef } from 'react';
import { Link } from 'wouter';

// Helper component for scroll animations
const ScrollReveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ref.current?.classList.add('translate-y-0', 'opacity-100');
          ref.current?.classList.remove('translate-y-16', 'opacity-0');
        } else {
          // Fade out when scrolling up/out of view
          ref.current?.classList.add('translate-y-16', 'opacity-0');
          ref.current?.classList.remove('translate-y-0', 'opacity-100');
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-700 ease-out translate-y-16 opacity-0 ${className}`}>
      {children}
    </div>
  );
};

export default function Landing() {
  const features = [
    {
      num: '01.',
      title: 'Real-Time Detection',
      desc: 'Analyzes transactions instantly and predicts fraud.',
      highlight: false
    },
    {
      num: '02.',
      title: 'AI Risk Scoring',
      desc: 'Each transaction receives a probability score to identify risk.',
      highlight: true
    },
    {
      num: '03.',
      title: 'Smart Monitoring',
      desc: 'Tracks transaction patterns such as location and behavior.',
      highlight: false
    },
    {
      num: '04.',
      title: 'Fraud Alerts',
      desc: 'Flags high-risk transactions effectively.',
      highlight: false
    }
  ];

  const hiwSteps = [
    {
      num: '1',
      title: 'User submits a transaction',
      desc: 'The transaction is securely initiated through the digital gateway.'
    },
    {
      num: '2',
      title: 'System analyzes transaction features',
      desc: 'Cross-checks device fingerprint, location, and historical patterns.'
    },
    {
      num: '3',
      title: 'ML model calculates fraud probability',
      desc: 'Machine learning algorithms assign a risk likelihood to the behavior.'
    },
    {
      num: '4',
      title: 'Risk score is generated',
      desc: 'A specific risk value determines if intervention is required.'
    },
    {
      num: '5',
      title: 'Dashboard displays result',
      desc: 'Alerts the user and generates reports automatically.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0C0C0C] font-['Inter'] flex flex-col items-center overflow-x-hidden pt-16 relative">
      
      {/* Background Gradients (Bottom Only) */}
      {/* Ambient Glossy Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        {/* Center Glow */}
        <div className="absolute w-[120%] h-[800px] bg-[#FF5500] opacity-[0.55] blur-[160px] rounded-[100%] bottom-[-400px] left-1/2 -translate-x-1/2" />
        {/* Left Glow */}
        <div className="absolute w-[80%] h-[600px] bg-[#FF3B30] opacity-[0.12] blur-[140px] rounded-[100%] bottom-[-300px] left-[-20%]" />
        {/* Right Glow */}
        <div className="absolute w-[80%] h-[600px] bg-[#FF5500] opacity-[0.08] blur-[140px] rounded-[100%] bottom-[-300px] right-[-20%]" />
      </div>

      <div className="w-full max-w-[1547px] relative z-10 px-10 flex flex-col gap-10 py-10">
        
        {/* Intro Area */}
        <ScrollReveal className="flex flex-col items-center gap-[80px] pt-[60px] pb-[80px] w-full mt-10 relative">
          
          {/* Subtle Orange Glow behind text */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#FF5500] opacity-[0.15] blur-[120px] rounded-full pointer-events-none z-[-1]" />
          
          <div className="flex flex-col items-center gap-8 w-full max-w-4xl text-center">
            
            <h1 className="text-[#111827] dark:text-white font-['Sora'] text-[64px] font-[800] leading-[1.1] tracking-[-2px]">
              <span className="text-[#FF5500]">Safeguard</span> Every Transaction
            </h1>
            
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[18px] leading-[1.6] max-w-3xl">
              Our intelligent engine analyzes millions of data points in milliseconds,<br />
              providing your team with actionable insights to protect users from digital payment fraud.
            </p>

            <div className="flex items-center gap-6 mt-4">
              <Link href="/dashboard">
                <button className="bg-[#FF3B30] border border-[#FF5500] text-[#111827] dark:text-white px-8 py-4 rounded-lg font-['Inter'] font-semibold text-[15px] cursor-pointer hover:bg-[#E0352B] transition-colors">
                  Explore Dashboard
                </button>
              </Link>
              <button onClick={() => window.open('https://github.com/JYuenChia/digital-trust-fraud-shield.git', '_blank')} className="bg-[#FFFFFF]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-2xl border border-black/20 dark:border-white/20 text-[#111827] dark:text-white px-8 py-4 rounded-lg font-['Inter'] font-semibold text-[15px] cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Feature Section */}
        <ScrollReveal className="flex flex-col gap-[60px] py-[80px] w-full">
          {/* Feature Header */}
          <div className="flex justify-between items-end w-full">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[40px] font-bold leading-tight">
                Your trusted partner for<br />
                <span className="text-[#FF5500]">fraud prevention.</span>
              </h2>
            </div>
            <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[16px] leading-[1.6] max-w-[400px] text-right">
              Our system unites and secures a growing<br />
              ecosystem of specialized financial data to eliminate threats.
            </p>
          </div>

          {/* Carousel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className="group p-10 rounded-2xl flex flex-col gap-4 aspect-square justify-center transition-all duration-300 bg-[#FFFFFF]/80 dark:bg-[#1A1A1A]/80 border border-black/10 dark:border-white/10 hover:bg-[#FF5500] hover:shadow-[0_0_40px_rgba(255,85,0,0.3)] hover:scale-[1.02]"
              >
                <div className="font-['Sora'] text-2xl font-bold text-[#FF5500] group-hover:text-[#1A1A1A]">
                  {feat.num}
                </div>
                <h3 className="font-['Sora'] text-xl font-bold mt-4 text-[#111827] dark:text-white group-hover:text-[#111111]">
                  {feat.title}
                </h3>
                <p className="font-['Inter'] text-sm leading-[1.6] text-[#6B7280] dark:text-[#8A8A8A] group-hover:text-[#333333] group-hover:font-medium">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* How It Works Section */}
        <ScrollReveal className="flex flex-col gap-[60px] py-[80px] w-full">
          <h2 className="text-[#111827] dark:text-white font-['Sora'] text-[40px] font-bold">
            How It Works
          </h2>
          
          <div className="flex flex-col w-full">
            {hiwSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-0 group">
                <div className="w-[100px] md:w-[150px] shrink-0 border-r border-[#FF3B3020] relative pt-6 pb-12 pr-8 text-right">
                  <span className="text-[#FF5500] font-['Sora'] text-[32px] font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {step.num}
                  </span>
                  {/* Timeline dot */}
                  <div className="absolute right-[-6px] top-9 w-3 h-3 rounded-full bg-[#FF5500] shadow-[0_0_10px_#FF5500]" />
                </div>
                <div className="pt-6 pb-12 pl-12 flex flex-col gap-3">
                  <h3 className="text-[#111827] dark:text-white font-['Sora'] text-2xl font-bold">
                    {step.title}
                  </h3>
                  <p className="text-[#6B7280] dark:text-[#8A8A8A] font-['Inter'] text-[16px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </div>
  );
}
