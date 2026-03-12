import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Shield, Zap, TrendingUp, Lock } from 'lucide-react';

/**
 * Landing Page - Digital Trust Fraud Shield
 * 
 * Design: Modern FinTech landing page with warm orange accents
 * - Hero section with headline and CTA
 * - Feature showcase
 * - Trusted by section
 * - Call-to-action footer
 */

export default function Landing() {
  const features = [
    {
      icon: Shield,
      title: 'Real-Time Protection',
      description: 'AI-powered fraud detection in milliseconds, protecting every transaction.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-millisecond response times ensure seamless user experience.',
    },
    {
      icon: TrendingUp,
      title: 'Behavioral Analytics',
      description: 'Learn and adapt to user patterns for smarter fraud detection.',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'Enterprise-grade security with zero data compromise.',
    },
  ];

  const companies = ['FeatherDev', 'Boltshift', 'GlobalBank', 'LightHub'];

  return (
    <div className="min-h-screen bg-[#0f0d0a] overflow-hidden">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Orange glow - top center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.4), transparent)',
          }}
        />
        {/* Dark brown gradient - bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[400px]"
          style={{
            background: 'linear-gradient(to top, rgba(255, 107, 53, 0.1), transparent)',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,107,53,0.1)] border border-[rgba(255,107,53,0.2)] rounded-full mb-8">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">New version is out! Read more</span>
            <ArrowRight size={16} className="text-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Accelerate Your Security
            <span className="text-primary"> With AI</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-driven fraud detection & risk analysis. Empower your team, protect every transaction, and maximize security effortlessly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/dashboard">
              <a className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-full font-semibold hover:bg-[#e85d04] transition-colors">
                <span>Get started for free</span>
              </a>
            </Link>
            <button className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-[rgba(255,107,53,0.3)] text-foreground rounded-full font-semibold hover:bg-[rgba(255,107,53,0.05)] transition-colors">
              <span>▶</span>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trusted By */}
          <div className="pt-8 border-t border-[rgba(255,107,53,0.1)]">
            <p className="text-sm text-muted-foreground mb-6">Trusted by 200+ companies</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-60">
              {companies.map((company) => (
                <div key={company} className="text-sm font-medium text-muted-foreground">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to protect your transactions and build trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-8 bg-[rgba(26,20,16,0.6)] border border-[rgba(255,107,53,0.1)] rounded-2xl hover:border-[rgba(255,107,53,0.3)] transition-colors group"
                >
                  <div className="w-12 h-12 bg-[rgba(255,107,53,0.1)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[rgba(255,107,53,0.2)] transition-colors">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-[rgba(26,20,16,0.8)] border border-[rgba(255,107,53,0.2)] rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to protect your transactions?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of companies using Digital Trust Fraud Shield to secure their payments.
            </p>
            <Link href="/dashboard">
              <a className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-full font-semibold hover:bg-[#e85d04] transition-colors">
                <span>Start Free Trial</span>
                <ArrowRight size={20} />
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(255,107,53,0.1)] bg-[rgba(26,20,16,0.4)] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>Digital Trust Fraud Shield © 2026 | Protecting transactions worldwide</p>
        </div>
      </footer>


    </div>
  );
}
