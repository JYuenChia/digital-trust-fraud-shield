import React from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert, Search, Bell , Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTour } from '@/contexts/TourContext';

export const Navigation: React.FC = () => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { startTour } = useTour();
  const { t } = useLanguage();
  const isProfilePage = location === '/profile';

  const navItems = [
    { label: t('nav.overview'), href: '/' },
    { label: t('nav.dashboard'), href: '/dashboard' },
    { label: t('nav.admin'), href: '/admin' },
    { label: t('nav.transactions'), href: '/transaction' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F3F4F6]/80 dark:bg-[#0C0C0C]/80 backdrop-blur-md border-b border-[#D1D5DB] dark:border-[#2A2A2A]">
      <div className="max-w-[1547px] mx-auto px-10 h-16 flex items-center justify-between relative">
        
        {/* Brand */}
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <ShieldAlert size={24} className="text-[#FF3B30]" />
            <span className="text-[#111827] dark:text-white font-['Inter'] font-bold text-[13px] tracking-[1px]">
              DIGITAL TRUST
            </span>
          </div>
        </Link>

        {/* Tab Links - Centered Exactly */}
        <div className="hidden md:flex h-full items-end gap-12 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className="relative h-full flex flex-col justify-center cursor-pointer group px-1">
                  <span
                    className={`font-['Inter'] text-[13px] font-bold tracking-[1px] transition-colors mt-auto mb-5 ${
                      isActive ? 'text-[#111827] dark:text-white' : 'text-[#6B7280] dark:text-[#8A8A8A] group-hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF3B30] rounded-t-sm" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-[#111827] dark:text-white hover:text-[#FF3B30] p-2"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Header Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-6">
          {/* Search Box */}
          <div className="flex items-center gap-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] rounded-lg px-4 py-2.5">
            <Search size={18} className="text-[#6B7280] dark:text-[#8A8A8A]" />
            <input 
              type="text" 
              placeholder={t('nav.searchPlaceholder')} 
              className="bg-transparent border-none outline-none text-[#6B7280] dark:text-[#8A8A8A] text-sm font-['Inter'] w-48 placeholder:text-[#6B7280] dark:placeholder:text-[#8A8A8A]"
            />
          </div>

          {/* Profile Box */}
          <div className="flex items-center gap-6">
            <button className="text-[#111827] dark:text-white hover:text-[#FF3B30] transition-colors border-none bg-transparent cursor-pointer">
              <Bell size={20} />
            </button>
            <Link href="/profile">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#111827] dark:text-white font-['Inter'] font-semibold text-sm cursor-pointer transition-all ${isProfilePage ? 'bg-[#FF3B30] shadow-[0_0_16px_rgba(255,59,48,0.45)]' : 'bg-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.3)] hover:bg-[#FF6A1A]'}`}>
                AT
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-[#FFFFFF] dark:bg-[#1A1A1A] border-b border-[#D1D5DB] dark:border-[#2A2A2A] shadow-xl flex flex-col p-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`py-3 px-4 rounded-lg cursor-pointer ${isActive ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'text-[#6B7280] dark:text-[#8A8A8A]'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-['Inter'] font-bold text-sm tracking-widest">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <div className="h-px bg-black/10 dark:bg-white/10 my-2"></div>
          <button
            type="button"
            onClick={() => {
              startTour();
              setIsMobileMenuOpen(false);
            }}
            className="py-3 px-4 rounded-lg cursor-pointer text-[#FF5500] border border-[#FF5500]/30 hover:bg-[#FF5500]/10 text-left"
          >
            <span className="font-['Inter'] font-bold text-sm tracking-widest">{t('nav.startTour')}</span>
          </button>
          <Link href="/profile">
            <div 
              className="py-3 px-4 rounded-lg cursor-pointer text-[#111827] dark:text-white flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="font-['Inter'] font-bold text-sm tracking-widest">{t('nav.profileSettings')}</span>
              <div className="w-8 h-8 rounded-full bg-[#FF5500] text-white flex items-center justify-center text-xs font-semibold">AT</div>
            </div>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
