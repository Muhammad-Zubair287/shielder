'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Moon, Sun, Globe } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { usePathname } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '@/hooks/useAuth';
import profileService from '@/services/profile.service';
import { useLanguage } from '@/contexts/LanguageContext';

export const Navbar = () => {
  const { setIsMobileOpen, toggleSidebar, sidebarCollapsed } = useDashboard();
  const { user } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Dynamic Title Logic
  const getPageTitle = (path: string) => {
    if (path === '/superadmin' || path === '/admin' || path === '/dashboard') return 'Dashboard Overview';
    
    const parts = path.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    
    if (!lastPart) return 'Dashboard';
    
    // Formatting: users -> Users, order-details -> Order Details
    return lastPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Dark mode persistence
  useEffect(() => {
    // 1. Initial sync from localStorage (instant feedback)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // 2. Sync from user profile preference if available
    const dbTheme = (user?.profile?.preferences as any)?.theme;
    if (dbTheme) {
      const isDbDark = dbTheme === 'dark';
      setIsDarkMode(isDbDark);
      if (isDbDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [user]);

  // Close language menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const theme = newMode ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    // Dispatch a custom event so ThemeClientWrapper updates immediately
    window.dispatchEvent(new Event('theme-toggle'));

    // Persist to DB if logged in
    if (user) {
      try {
        await profileService.updatePreferences({ theme });
      } catch (error) {
        console.error('Failed to sync theme preference:', error);
      }
    }
  };

  return (
    <header className="h-20 bg-white/80 dark:bg-slate-950/75 backdrop-blur-md border-b border-gray-100/80 dark:border-slate-800 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between transition-all duration-300 w-full min-w-0 shadow-[0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center space-x-4 md:space-x-6">
        {/* Toggle Button (Hamburger) */}
        <button 
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsMobileOpen(true);
            } else {
              toggleSidebar();
            }
          }}
          className="p-2.5 text-gray-600 dark:text-slate-300 hover:bg-shielder-primary/10 dark:hover:bg-white/5 hover:text-shielder-primary rounded-xl transition-all active:scale-90 shadow-sm md:shadow-none bg-white dark:bg-slate-900/80 md:bg-transparent border border-gray-100 dark:border-slate-800/80"
        >
          <Menu size={22} className={sidebarCollapsed ? "" : "rotate-90 transition-transform"} />
        </button>

        {/* Dynamic Page Title */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
            {getPageTitle(pathname)}
          </h1>
          <p className="text-[10px] font-bold text-shielder-primary uppercase tracking-[0.2em] dark:text-[#ff8a5b]">
            System Control Panel
          </p>
        </div>
      </div>

      {/* Global Search - Dynamic Responsive Behavior */}
      <div className="flex-1 max-w-xl mx-4 lg:mx-12">
        <GlobalSearch />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="p-2.5 text-gray-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-white/5 hover:text-amber-600 rounded-xl transition-all group border border-transparent dark:hover:border-slate-700"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} className="group-hover:scale-110 transition-transform" />}
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Language Switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-slate-100 rounded-xl text-xs font-bold transition-all"
            title="Switch Language"
          >
            <Globe size={16} />
            <span className="hidden sm:inline uppercase tracking-wide">{locale}</span>
          </button>

          {showLangMenu && (
            <div className="absolute end-0 top-full mt-2 w-44 bg-white dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-gray-50 dark:border-slate-800">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">{t('switchLanguage')}</p>
              </div>
              {[
                { code: 'en' as const, label: 'English', native: 'English', flag: '🇬🇧' },
                { code: 'ar' as const, label: 'Arabic',  native: 'العربية', flag: '🇸🇦' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code); setShowLangMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-start ${locale === lang.code ? 'bg-shielder-primary/5 dark:bg-white/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{lang.native}</span>
                  </div>
                  {locale === lang.code && (
                    <span className="w-2 h-2 rounded-full bg-shielder-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="h-8 w-px bg-gray-100 dark:bg-slate-800 hidden sm:block"></div>

        {/* User Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
};

