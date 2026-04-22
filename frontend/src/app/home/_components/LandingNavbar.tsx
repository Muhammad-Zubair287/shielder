'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, MessageCircle } from 'lucide-react';
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
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t('landingNavHome'), href: '/home' },
    { label: t('landingNavProducts'), href: '/products' },
    { label: t('landingNavRequestQuote'), href: '/generate-quotation' },
    { label: t('landingNavContact'), href: '/contact' },
    ...(user
      ? [
          { label: t('myOrders.title'), href: '/my-orders' },
          { label: t('myQuotations.title'), href: '/my-quotations' },
        ]
      : []),
  ];

  const profileDisplayName = user?.profile?.fullName?.trim() || user?.email || t('profile.viewProfile');
  const profileFirstName = profileDisplayName.split(/\s+/)[0] || t('profile.viewProfile');

  return (
    <>
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? 'shadow-lg' : 'shadow-sm border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-20 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>

          {/* Logo */}
          <Link href="/home" className="flex-shrink-0 flex items-center">
            <div className="relative h-14 w-40 sm:w-44 lg:w-48 xl:w-52">
              <Image src="/images/shielder-logo.png" alt="Shielder" fill className="object-contain object-left" sizes="256px" priority />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className={`hidden xl:flex items-center gap-0.5 ${isRTL ? 'mr-4' : 'ml-4'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-[#F97316] transition-colors rounded-lg whitespace-nowrap">
                {link.label}
              </Link>
            ))}

            {!user ? (
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-[#F97316] transition-colors rounded-lg whitespace-nowrap"
              >
                {t('landingNavLogin')}
              </Link>
            ) : null}
          </nav>

          <div className="flex-1" />

          {/* Actions */}
          <div className={`flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''} ml-2`}>
            <LanguageSwitcher variant="pills" />
            <a href="https://wa.me/966506814416" target="_blank" rel="noopener noreferrer"
              className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
              <MessageCircle size={20} />
            </a>
            <CartBadge />
            <QuotationBadge />
            {user ? (
              <Link
                href="/profile"
                className={`hidden xl:flex flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-[#F97316]/40 hover:shadow-md ${isRTL ? 'text-right' : 'text-left'}`}
                aria-label="Open profile"
              >
                <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#F97316]/20 bg-gray-100 text-gray-600">
                  {user.profile?.profileImage ? (
                    <Image
                      src={getImageUrl(user.profile.profileImage)}
                      alt={profileDisplayName}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase">
                      {profileFirstName.slice(0, 1)}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold text-gray-700 leading-none max-w-[64px] truncate text-center">
                  {profileFirstName}
                </span>
              </Link>
            ) : null}
            <button className="xl:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t border-gray-100 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3.5 text-sm font-semibold text-gray-700 hover:text-[#F97316] hover:bg-orange-50 border-b border-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}>
              {link.label}
            </Link>
          ))}

          <Link
            href={user ? '/profile' : '/login'}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-gray-700 hover:text-[#F97316] hover:bg-orange-50 border-b border-gray-50 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-600">
              {user?.profile?.profileImage ? (
                <Image
                  src={getImageUrl(user.profile.profileImage)}
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
        </div>
      )}
    </header>
    <QuotationDrawer />
    <LiveChatWidget />
    </>
  );
}
