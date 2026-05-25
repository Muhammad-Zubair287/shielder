'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, MessageCircle, User, LogOut, ChevronDown } from 'lucide-react';
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
  const profileRef = useRef<HTMLDivElement>(null);

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

  const navLinks = [
    { label: t('landingNavHome'), href: '/home' },
    { label: t('landingNavProducts'), href: '/products' },
    { label: t('landingNavRequestQuote'), href: '/generate-quotation' },
    { label: t('landingNavContact'), href: '/contact' },
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
      return `block px-6 py-3.5 text-sm transition-colors border-b border-gray-50 ${isRTL ? 'text-right' : 'text-start'} ${
        active
          ? 'bg-orange-50 text-[#F97316] font-bold'
          : 'text-gray-700 font-semibold hover:text-[#F97316] hover:bg-orange-50'
      }`;
    }

    return `px-2 py-2 text-[13px] transition-colors rounded-lg whitespace-nowrap ${
      active
        ? 'bg-orange-50 text-[#F97316] font-extrabold'
        : 'text-gray-700 font-semibold hover:text-[#F97316]'
    }`;
  };

  return (
    <>
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? 'shadow-lg' : 'shadow-sm border-b border-gray-100'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-20 gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>

          {/* Logo */}
          <Link href="/home" className="flex-shrink-0 flex items-center">
            <div className="relative h-12 w-36 sm:w-40 lg:w-44">
              <Image src="/images/shielder-logo.png" alt="Shielder" fill className={`object-contain ${isRTL ? 'object-right' : 'object-left'}`} sizes="200px" priority />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0 ms-2" dir={isRTL ? 'rtl' : 'ltr'}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={navLinkClassName(link.href)}>
                {link.label}
              </Link>
            ))}

            {!user ? (
              <Link
                href="/login"
                aria-current={isActiveLink('/login') ? 'page' : undefined}
                className={navLinkClassName('/login')}
              >
                {t('landingNavLogin')}
              </Link>
            ) : null}
          </nav>

          <div className="flex-1" />

          {/* Actions */}
          <div className={`flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''} ms-1`}>
            <div className="scale-90 origin-right">
              <LanguageSwitcher variant="pills" />
            </div>
            <a href="https://wa.me/966506814416" target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
              <MessageCircle size={18} />
            </a>
            <CartBadge />
            <QuotationBadge />
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className={`hidden lg:flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 active:scale-95`}
                  aria-label="Toggle profile menu"
                >
                  <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#F97316]/20 bg-gray-100 text-gray-600 shadow-sm">
                    {user.profile?.profileImage ? (
                      <Image
                        src={getImageUrl(user.profile.profileImage) || '/images/default-avatar.png'}
                        alt={profileDisplayName}
                        fill
                        className="object-cover"
                        sizes="40px"
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
                  <div className={`fixed lg:absolute ${isRTL ? 'left-4 lg:left-0' : 'right-4 lg:right-0'} top-20 lg:top-full mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 z-[100] overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#F97316] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <User size={16} />
                      <span>{t('profile.viewProfile')}</span>
                    </Link>
                    <div className="h-px bg-gray-50 my-1" />
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
            ) : null}
            <button className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
          {navLinks.map(link => (
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
            className={`flex items-center gap-3 px-6 py-3.5 text-sm border-b border-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-start'} ${
              isActiveLink(user ? '/profile' : '/login')
                ? 'bg-orange-50 text-[#F97316] font-bold'
                : 'text-gray-700 font-semibold hover:text-[#F97316] hover:bg-orange-50'
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-600">
              {user?.profile?.profileImage ? (
                <Image
                  src={getImageUrl(user.profile.profileImage) || '/images/default-avatar.png'}
                  alt={user.profile?.fullName || user.email || 'Profile'}
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
              className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 border-b border-gray-50 ${isRTL ? 'flex-row-reverse text-right' : 'text-start'}`}
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
