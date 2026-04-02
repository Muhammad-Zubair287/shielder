'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import CartBadge from '@/components/cart/CartBadge';
import QuotationBadge from '@/components/cart/QuotationBadge';
import QuotationDrawer from '@/components/cart/QuotationDrawer';
import LiveChatWidget from '@/components/LiveChatWidget';

export default function LandingNavbar() {
  const { t, isRTL } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t('landingNavHome'),     href: '/home'     },
    { label: t('landingNavProducts'), href: '/products' },
    { label: 'Request a Quote',       href: '/generate-quotation' },
    { label: t('landingNavContact'),  href: '/contact'  },
    { label: t('landingNavLogin'),    href: '/login'    },
  ];

  return (
    <>
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? 'shadow-lg' : 'shadow-sm border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-20 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>

          {/* Logo */}
          <Link href="/home" className="flex-shrink-0 flex items-center">
            <div className="relative h-20 w-64" style={{ transform: 'scale(1.4)', transformOrigin: 'left center' }}>
              <Image src="/images/shielder-logo.png" alt="Shielder" fill className="object-contain object-left" sizes="256px" priority />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className={`hidden md:flex items-center gap-1 ${isRTL ? 'mr-6' : 'ml-6'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-[#F97316] transition-colors rounded-lg whitespace-nowrap">
                {link.label}
              </Link>
            ))}
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
            <button className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input ref={searchRef} type="text" placeholder={t('landingNavSearchPlaceholder')}
                className={`w-full bg-gray-100 rounded-full text-sm py-2.5 outline-none focus:ring-2 focus:ring-[#F97316]/30 ${isRTL ? 'pr-8 pl-4 text-right' : 'pl-8 pr-4'}`}
              />
            </div>
          </div>
        )}
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3.5 text-sm font-semibold text-gray-700 hover:text-[#F97316] hover:bg-orange-50 border-b border-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
    <QuotationDrawer />
    <LiveChatWidget />
    </>
  );
}
