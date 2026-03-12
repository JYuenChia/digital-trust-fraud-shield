import React, { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';

/**
 * Navigation Component
 * 
 * Design: Modern FinTech with warm orange accents
 * - Fixed header with logo and navigation menu
 * - Responsive mobile menu
 * - Active link highlighting
 */

interface NavigationProps {
  currentPath?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPath = '/' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Contact', href: '/#contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath?.startsWith(href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0d0a] border-b border-[rgba(255,107,53,0.1)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 text-2xl font-bold text-foreground hover:text-primary transition-colors">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">DT</span>
              </div>
              <span className="font-sora">Digital Trust</span>
            </a>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link href="/dashboard">
              <a className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-[#e85d04] transition-colors">
                Get Started
              </a>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground hover:text-primary transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-[rgba(255,107,53,0.1)] pt-4">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary text-white'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
              <Link href="/dashboard">
                <a
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 bg-primary text-white rounded-lg font-medium text-center hover:bg-[#e85d04] transition-colors"
                >
                  Get Started
                </a>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
