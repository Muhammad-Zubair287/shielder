'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LandingFooter() {
  const { t, isRTL } = useLanguage();
  const year = new Date().getFullYear();

  const quickLinks = [
    { label: t('landingFooterLinkHome'),    href: '/home'     },
    { label: t('landingFooterLinkProduct'), href: '/products' },
    { label: t('landingFooterLinkContact'), href: '#contact'  },
    { label: t('landingFooterLinkAdmin'),   href: '/login'    },
  ];
  const categories = [
    { label: t('landingFooterCatAir'),    href: '/products?category=air'    },
    { label: t('landingFooterCatDiesel'), href: '/products?category=diesel' },
    { label: t('landingFooterCatOil'),    href: '/products?category=oil'    },
  ];
  const legalLinks = [
    { label: t('landingFooterPrivacy'), href: '#' },
    { label: t('landingFooterTerms'),   href: '#' },
    { label: t('landingFooterCookies'), href: '#' },
  ];

  return (
    <footer className="bg-[#0D1637] text-[#94A3B8]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-5">
            <Link href="/home" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="relative w-9 h-9 flex-shrink-0">
                <Image src="/images/landing/logo.jpeg" alt="FilterPro" fill className="object-contain rounded-lg" sizes="36px" />
              </div>
              <span className="font-extrabold text-white text-base uppercase tracking-widest">FilterPro</span>
            </Link>
            <p className={`text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>{t('landingFooterAbout')}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`text-white font-bold text-sm uppercase tracking-widest mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('landingFooterQuickLinks')}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map(l => (
                <li key={l.href} className={isRTL ? 'text-right' : 'text-left'}>
                  <Link href={l.href} className="text-sm hover:text-[#F97316] transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className={`text-white font-bold text-sm uppercase tracking-widest mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('landingFooterCategories')}
            </h4>
            <ul className="space-y-3">
              {categories.map(c => (
                <li key={c.href} className={isRTL ? 'text-right' : 'text-left'}>
                  <Link href={c.href} className="text-sm hover:text-[#F97316] transition-colors">{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={`text-white font-bold text-sm uppercase tracking-widest mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('landingFooterContact')}
            </h4>
            <ul className="space-y-4">
              <li className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <MapPin size={15} className="text-[#F97316] mt-0.5 flex-shrink-0" />
                <span>{t('landingFooterAddress')}</span>
              </li>
              <li className={`flex items-center gap-3 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Phone size={15} className="text-[#F97316] flex-shrink-0" />
                <a href="tel:+966506814416" className="hover:text-[#F97316] transition-colors" dir="ltr">+966 50 681 4416</a>
              </li>
              <li className={`flex items-center gap-3 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Mail size={15} className="text-[#F97316] flex-shrink-0" />
                <a href="mailto:info@filterpro.com" className="hover:text-[#F97316] transition-colors">info@filterpro.com</a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B] ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <p>© {year} FilterPro. All rights reserved.</p>
            <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {legalLinks.map(l => (
                <Link key={l.href} href={l.href} className="hover:text-[#F97316] transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
