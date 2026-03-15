import React from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert, Search, Bell } from 'lucide-react';

export const Navigation: React.FC = () => {
  const [location] = useLocation();
  const isProfilePage = location === '/profile';

  const navItems = [
    { label: 'OVERVIEW', href: '/' },
    { label: 'DASHBOARD', href: '/dashboard' },
    { label: 'TRANSACTIONS', href: '/transaction' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0C0C0C]/80 backdrop-blur-md border-b border-[#2A2A2A]">
      <div className="max-w-[1547px] mx-auto px-10 h-16 flex items-center justify-between relative">
        
        {/* Brand */}
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <ShieldAlert size={28} className="text-[#FF3B30]" />
            <span className="text-white font-['Inter'] font-bold text-[13px] tracking-[1px]">
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
                      isActive ? 'text-white' : 'text-[#8A8A8A] group-hover:text-white'
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

        {/* Header Actions */}
        <div className="hidden md:flex items-center gap-6">
          {/* Search Box */}
          <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-lg px-4 py-2.5">
            <Search size={18} className="text-[#8A8A8A]" />
            <input 
              type="text" 
              placeholder="Search here..." 
              className="bg-transparent border-none outline-none text-[#8A8A8A] text-sm font-['Inter'] w-48 placeholder:text-[#8A8A8A]"
            />
          </div>
          
          {/* Profile Box */}
          <div className="flex items-center gap-6">
            <button className="text-white hover:text-[#FF3B30] transition-colors border-none bg-transparent cursor-pointer">
              <Bell size={20} />
            </button>
            <Link href="/profile">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-['Inter'] font-semibold text-sm cursor-pointer transition-all ${isProfilePage ? 'bg-[#FF3B30] shadow-[0_0_16px_rgba(255,59,48,0.45)]' : 'bg-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.3)] hover:bg-[#FF6A1A]'}`}>
                AM
              </div>
            </Link>
          </div>
        </div>

      </div>
    </nav>
  );
};

export default Navigation;
