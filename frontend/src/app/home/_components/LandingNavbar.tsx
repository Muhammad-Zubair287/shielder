'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, MessageCircle, User, LogOut, ChevronDown, Search, ShoppingCart, Phone, Truck, Headphones, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import CartBadge from '@/components/cart/CartBadge';
import QuotationBadge from '@/components/cart/QuotationBadge';
import QuotationDrawer from '@/components/cart/QuotationDrawer';
import LiveChatWidget from '@/components/LiveChatWidget';
import { getImageUrl } from '@/utils/helpers';

export default function LandingNavbar() {
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // New design navbar items (visible) - Login before Contact
  const visibleNavLinks = [
    { label: t('landingNavHome'), href: '/home' },
    { label: t('landingNavProducts'), href: '/products' },
    { label: t('landingNavApplications'), href: '/applications' },
    { label: t('landingNavAboutUs'), href: '/about-us' },
    { label: t('landingNavResources'), href: '/resources' },
    { label: t('landingNavLogin'), href: '/login' },
    { label: t('landingNavContact'), href: '/contact' },
  ];

  // Old navbar items (hidden but kept for functionality)
  const hiddenNavLinks = [
    { label: t('landingNavRequestQuote'), href: '/generate-quotation' },
    { label: t('landingNavPrivacy'), href: '/privacy-policy' },
    ...(user
      ? [
          { label: t('myOrders.title'), href: '/my-orders' },
          { label: t('myQuotations.title'), href: '/my-quotations' },
        ]
      : []),
  ];

  const profileDisplayName = user?.profile?.fullName?.trim() || user?.email || t('profile.viewProfile');
  const profileFirstName = profileDisplayName.split(/\s+/)[0] || t('profile.viewProfile');

  const isActiveLink = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/';
    }

    if (href === '/products') {
      return pathname === '/products' || pathname.startsWith('/products/');
    }

    if (href === '/generate-quotation') {
      return pathname === '/generate-quotation' || pathname.startsWith('/generate-quotation/');
    }

    if (href === '/my-quotations') {
      return pathname === '/my-quotations' || pathname.startsWith('/my-quotation/');
    }

    return pathname === href;
  };

  const navLinkClassName = (href: string, mobile = false) => {
    const active = isActiveLink(href);

    if (mobile) {
      return `block px-6 py-3.5 text-sm transition-colors border-b border-gray-100 ${isRTL ? 'text-right' : 'text-start'} ${
        active
          ? 'bg-blue-50 text-[#0205A6] font-bold'
          : 'text-gray-700 font-semibold hover:text-[#0205A6] hover:bg-gray-50'
      }`;
    }

    return `px-3 py-2 text-[13px] transition-colors rounded-lg whitespace-nowrap ${
      active
        ? 'bg-blue-50 text-[#0205A6] font-extrabold'
        : 'text-gray-700 font-semibold hover:text-[#0205A6] hover:bg-gray-50'
    }`;
  };

  return (
    <>
      {/* Combined Navbar with Top Bar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? 'shadow-lg' : 'border-b border-[#EAEAEA]'
        }`}
      >
        {/* Top Information Bar */}
        <div className="bg-[#0A1E36] text-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex items-center justify-between h-[40px] text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Left Side - Tagline */}
              <div className="hidden sm:flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="font-semibold">{t('topBarTagline') || 'High Performance Filters. Maximum Protection.'}</span>
              </div>

              {/* Right Side - Contact Info */}
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="hidden md:flex items-center gap-1.5">
                  <Truck size={14} className="text-green-400" />
                  <span>{t('topBarFastShipping') || 'Fast Shipping'}</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                  <Headphones size={14} className="text-blue-400" />
                  <span>{t('topBarExpertSupport') || 'Expert Support'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={14} className="text-green-400" />
                  <a href="tel:+966506814416" className="font-semibold hover:text-green-400 transition-colors">
                    +966 50 681 4416
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navbar Content */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center h-[72px] gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>

            {/* Logo */}
            <Link href="/home" className="flex-shrink-0 flex items-center">
              <div className="flex items-center justify-center h-10 px-2 bg-white rounded">
                <Image
                  src="/images/shielder navbar logo 2.jpeg"
                  alt="Shielder"
                  width={120}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Nav - Only visible items from new design */}
            <nav className="hidden lg:flex items-center gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
              {visibleNavLinks.map(link => (
                <Link key={link.href} href={link.href}
                  aria-current={isActiveLink(link.href) ? 'page' : undefined}
                  className={`relative px-1 py-2 text-[12px] font-semibold uppercase tracking-[0.4px] leading-[18px] transition-colors whitespace-nowrap ${
                    isActiveLink(link.href)
                      ? 'text-[#0D2F8C]'
                      : 'text-[#1F2937] hover:text-[#0D2F8C]'
                  }`}>
                  {link.label}
                  {isActiveLink(link.href) && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0D2F8C]" />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

             {/* Actions */}
             <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Search Input */}
                <div className="relative" ref={searchRef}>
                  <input
                    type="text"
                    placeholder={t('landingNavSearchPlaceholder') || 'Search by filter number...'}
                    className="w-[170px] lg:w-[190px] h-[34px] pl-3 pr-8 border border-[#E5E7EB] rounded text-[13px] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0D2F8C]"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <Search size={16} className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[#9CA3AF]`} />
                </div>

                <div className={`scale-90 ${isRTL ? 'origin-left' : 'origin-right'}`}>
                  <LanguageSwitcher variant="pills" />
                </div>
                <CartBadge />
                <QuotationBadge />
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    className={`hidden lg:flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 active:scale-95`}
                    aria-label="Toggle profile menu"
                  >
                    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#0205A6]/20 bg-gray-100 text-gray-600 shadow-sm">
                      {user.profile?.profileImage ? (
                        <Image
                          src={getImageUrl(user.profile.profileImage) || '/images/default-avatar.png'}
                          alt={profileDisplayName}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <span className="text-sm font-bold uppercase">
                          {profileFirstName.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-gray-700 leading-none truncate max-w-[64px] text-center">
                      {profileFirstName}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className={`fixed lg:absolute ${isRTL ? 'left-4 lg:left-0' : 'right-4 lg:right-0'} top-20 lg:top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-[100] overflow-hidden`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#0205A6] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <User size={16} />
                        <span>{t('profile.viewProfile')}</span>
                      </Link>
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logout();
                          setProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <LogOut size={16} />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0205A6] hover:bg-[#0104a0] rounded-lg transition-colors`}
                >
                  {t('landingNavLogin')}
                </Link>
              )}
              <button className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(v => !v)}>
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Visible nav links */}
            {visibleNavLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={navLinkClassName(link.href, true)}>
                {link.label}
              </Link>
            ))}

            {/* Hidden nav links (preserved for functionality) */}
            {hiddenNavLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={navLinkClassName(link.href, true)}>
                {link.label}
              </Link>
            ))}

            <Link
              href={user ? '/profile' : '/login'}
              onClick={() => setMobileOpen(false)}
              aria-current={isActiveLink(user ? '/profile' : '/login') ? 'page' : undefined}
              className={`flex items-center gap-3 px-6 py-3.5 text-sm border-b border-gray-100 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-start'} ${
                isActiveLink(user ? '/profile' : '/login')
                  ? 'bg-blue-50 text-[#0205A6] font-bold'
                  : 'text-gray-700 font-semibold hover:text-[#0205A6] hover:bg-gray-50'
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-600">
                {user?.profile?.profileImage ? (
                  <Image
                    src={getImageUrl(user.profile.profileImage) || '/images/default-avatar.png'}
                    alt={user?.profile?.fullName || user.email || 'Profile'}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold uppercase">
                    {(user?.profile?.fullName || user?.email || 'U').slice(0, 1)}
                  </span>
                )}
              </span>
              <span>{user ? profileFirstName : t('landingNavLogin')}</span>
            </Link>

            {user && (
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 border-b border-gray-100 ${isRTL ? 'flex-row-reverse text-right' : 'text-start'}`}
              >
                <LogOut size={20} className={isRTL ? 'rotate-180' : ''} />
                <span>{t('auth.logout')}</span>
              </button>
            )}
          </div>
        )}
      </header>
      <QuotationDrawer />
      <LiveChatWidget />
    </>
  );
}