#!/usr/bin/env python3
"""Writes all Figma-matched landing page components."""
import os

BASE = "/Users/mzubair/Documents/Professional/DevFlx/shielder/frontend/src/app/home/_components/"

files = {}

# ─── LandingNavbar ───────────────────────────────────────────────────────────
files["LandingNavbar.tsx"] = """\
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, Menu, X, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LandingNavbar() {
  const { t, isRTL } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const navLinks = [
    { label: t('landingNavHome'),     href: '/home'     },
    { label: t('landingNavProducts'), href: '/products' },
    { label: t('landingNavContact'),  href: '#contact'  },
    { label: t('landingNavLogin'),    href: '/login'    },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? 'shadow-lg' : 'shadow-sm border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-16 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>

          {/* Logo */}
          <Link href="/home" className="flex-shrink-0 flex items-center gap-2">
            <div className="relative w-9 h-9">
              <Image src="/images/landing/logo.jpeg" alt="Shielder" fill className="object-contain rounded-lg" sizes="36px" />
            </div>
            <span className="font-extrabold text-gray-900 text-base uppercase tracking-widest hidden sm:block">
              Shielder
            </span>
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

          {/* Search */}
          <div className="hidden md:flex w-60 lg:w-72">
            <div className="relative w-full">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input type="text" placeholder={t('landingNavSearchPlaceholder')}
                className={`w-full bg-gray-100 hover:bg-gray-200 focus:bg-white rounded-full text-sm py-2 text-gray-700 outline-none focus:ring-2 focus:ring-[#F97316]/30 placeholder:text-gray-400 transition-all ${
                  isRTL ? 'pr-8 pl-4 text-right' : 'pl-8 pr-4'
                }`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''} ml-2`}>
            <button className="md:hidden p-2 text-gray-600 hover:text-[#F97316] rounded-lg" onClick={() => setSearchOpen(v => !v)}>
              <Search size={20} />
            </button>
            <LanguageSwitcher variant="pills" />
            <a href="https://wa.me/966506814416" target="_blank" rel="noopener noreferrer"
              className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
              <MessageCircle size={20} />
            </a>
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors">
              <ShoppingCart size={20} />
              <span className="absolute top-0.5 right-0.5 bg-[#F97316] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">0</span>
            </Link>
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
  );
}
"""

# ─── HeroSection ─────────────────────────────────────────────────────────────
files["HeroSection.tsx"] = """\
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HeroSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section
      className="relative pt-16 min-h-[92vh] bg-[#0D1637] overflow-hidden flex items-center"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* bg accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-l from-[#162050]/80 to-transparent" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#F97316]/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/3 w-2 h-2 bg-[#F97316] rounded-full opacity-60" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white rounded-full opacity-20" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Text */}
          <div className={`space-y-7 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div>
              <span className="inline-block bg-[#F97316] text-white text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
                {t('landingHeroBadge')}
              </span>
            </div>

            <h1 className="text-[2.6rem] sm:text-5xl lg:text-[3.4rem] xl:text-[3.75rem] font-extrabold text-white leading-[1.1] tracking-tight">
              {t('landingHeroTitle')}
            </h1>

            <p className="text-[#94A3B8] text-base lg:text-[1.05rem] leading-relaxed max-w-[480px]">
              {t('landingHeroSubtitle')}
            </p>

            {/* Buttons */}
            <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link href="/products"
                className="inline-flex items-center bg-[#F97316] hover:bg-[#e8650a] text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-xl shadow-[#F97316]/30 hover:shadow-[#F97316]/50 hover:-translate-y-0.5 text-sm tracking-wide">
                {t('landingHeroCta')}
              </Link>
              <Link href="#contact"
                className="inline-flex items-center border-2 border-white/25 hover:border-white/50 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:bg-white/8 text-sm tracking-wide">
                {t('landingHeroCtaSecondary')}
              </Link>
            </div>

            {/* Rating */}
            <div className={`flex items-center gap-4 pt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex ${isRTL ? 'flex-row-reverse' : '-space-x-2'}`}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="relative w-10 h-10 rounded-full border-2 border-[#0D1637] overflow-hidden bg-slate-700 flex-shrink-0">
                    <Image src={`/images/landing/user-${i}.jpg`} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ))}
              </div>
              <div>
                <div className={`flex gap-0.5 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {[...Array(5)].map((_,i) => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white text-sm font-semibold">{t('landingHeroRatingText')}</p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <div className="aspect-[1.05/1] relative">
                <Image
                  src="/images/landing/hero-robot.png"
                  alt={t('landingHeroImageAlt')}
                  fill priority
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-20 pb-6 px-6">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-1 h-10 bg-[#F97316] rounded-full flex-shrink-0" />
                  <p className="text-white font-semibold text-sm">{t('landingHeroClientSatisfied')}</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[#F97316]/15 rounded-xl -z-10 blur-sm" />
            <div className="absolute -top-4 -left-4 w-14 h-14 border border-[#F97316]/30 rounded-xl -z-10" />
          </div>

        </div>
      </div>
    </section>
  );
}
"""

# ─── StatsSection ────────────────────────────────────────────────────────────
files["StatsSection.tsx"] = """\
'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StatsSection() {
  const { t, isRTL } = useLanguage();

  const stats = [
    { value: t('landingStat1Value'), label: t('landingStat1Label') },
    { value: t('landingStat2Value'), label: t('landingStat2Label') },
    { value: t('landingStat3Value'), label: t('landingStat3Label') },
    { value: t('landingStat4Value'), label: t('landingStat4Label') },
  ];

  return (
    <section className="bg-white border-b border-gray-100 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className="flex-shrink-0 w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-500" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                <p className="text-gray-500 text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
"""

# ─── WhyChooseUsSection ──────────────────────────────────────────────────────
files["WhyChooseUsSection.tsx"] = """\
'use client';

import React from 'react';
import { ShieldCheck, BadgeCheck, Zap, LayoutGrid } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const FEATURES = [
  { icon: ShieldCheck, titleKey: 'landingWhyFeature1Title', descKey: 'landingWhyFeature1Desc' },
  { icon: BadgeCheck,  titleKey: 'landingWhyFeature2Title', descKey: 'landingWhyFeature2Desc' },
  { icon: Zap,         titleKey: 'landingWhyFeature3Title', descKey: 'landingWhyFeature3Desc' },
  { icon: LayoutGrid,  titleKey: 'landingWhyFeature4Title', descKey: 'landingWhyFeature4Desc' },
];

export default function WhyChooseUsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-20 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14 space-y-3">
          <div>
            <span className="inline-block bg-[#fff3e8] text-[#F97316] text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
              {t('landingWhyBadge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-[2.4rem] font-extrabold text-gray-900 tracking-tight">
            {t('landingWhyTitle')}
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            {t('landingWhySubtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div key={i} className={`group bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-xl hover:border-[#F97316]/20 transition-all duration-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="w-14 h-14 bg-[#FFF3E8] group-hover:bg-[#F97316] rounded-xl flex items-center justify-center mb-5 transition-colors duration-300">
                <Icon size={26} className="text-[#F97316] group-hover:text-white transition-colors duration-300" strokeWidth={1.8} />
              </div>
              <h3 className="font-bold text-gray-900 text-[1rem] mb-2">{t(titleKey)}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
"""

# ─── ProductCategoriesSection ────────────────────────────────────────────────
files["ProductCategoriesSection.tsx"] = """\
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = [
  { nameKey: 'landingCat1Name', descKey: 'landingCat1Desc', countKey: 'landingCat1ProductCount', image: '/images/landing/factory-1.png', href: '/products?category=air' },
  { nameKey: 'landingCat2Name', descKey: 'landingCat2Desc', countKey: 'landingCat2ProductCount', image: '/images/landing/factory-2.png', href: '/products?category=diesel' },
  { nameKey: 'landingCat3Name', descKey: 'landingCat3Desc', countKey: 'landingCat3ProductCount', image: '/images/landing/factory-3.png', href: '/products?category=oil' },
];

export default function ProductCategoriesSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-20 bg-[#0D1637]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14 space-y-3">
          <div>
            <span className="inline-block bg-[#F97316] text-white text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
              {t('landingCatBadge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-[2.4rem] font-extrabold text-white tracking-tight">
            {t('landingCatTitle')}
          </h2>
          <p className="text-[#94A3B8] text-base max-w-xl mx-auto leading-relaxed">
            {t('landingCatSubtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="group bg-[#162050] rounded-2xl overflow-hidden border border-white/5 hover:border-[#F97316]/40 transition-all duration-300 hover:shadow-2xl hover:shadow-[#F97316]/10 hover:-translate-y-1">
              <div className="relative h-52 overflow-hidden">
                <Image src={cat.image} alt={t(cat.nameKey)} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#162050]/90 via-[#162050]/20 to-transparent" />
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                  <span className="bg-[#F97316] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                    {t(cat.countKey)}
                  </span>
                </div>
              </div>
              <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="text-white font-bold text-xl mb-1.5">{t(cat.nameKey)}</h3>
                <p className="text-[#94A3B8] text-sm mb-5 leading-relaxed">{t(cat.descKey)}</p>
                <Link href={cat.href}
                  className={`inline-flex items-center gap-2 text-[#F97316] hover:text-white font-semibold text-sm transition-colors group/link ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="border-b border-[#F97316]/40 group-hover/link:border-white/40">{t('landingCatViewProduct')}</span>
                  <ArrowRight size={15} className={`group-hover/link:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover/link:-translate-x-1 group-hover/link:translate-x-0' : ''}`} />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
"""

# ─── TrustSection ────────────────────────────────────────────────────────────
files["TrustSection.tsx"] = """\
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const POINTS = [
  'landingTrustPoint1','landingTrustPoint2','landingTrustPoint3',
  'landingTrustPoint4','landingTrustPoint5','landingTrustPoint6',
] as const;

export default function TrustSection() {
  const { t, isRTL } = useLanguage();

  const stats = [
    { v: t('landingTrustStat1Value'), l: t('landingTrustStat1Label') },
    { v: t('landingTrustStat2Value'), l: t('landingTrustStat2Label') },
    { v: t('landingTrustStat3Value'), l: t('landingTrustStat3Label') },
  ];

  return (
    <section className="py-20 bg-[#F8FAFC]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-start">

          {/* Image */}
          <div className={`relative ${isRTL ? 'lg:order-last' : ''}`}>
            <div className="relative rounded-2xl overflow-hidden aspect-[1.1/1] shadow-2xl shadow-slate-200">
              <Image src="/images/landing/hero-robot.png" alt={t('landingTrustImageAlt')} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/10 to-transparent" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-28 h-28 bg-[#F97316]/10 rounded-2xl -z-10" />
            <div className="absolute -top-4 -left-4 w-14 h-14 border border-[#F97316]/20 rounded-xl -z-10" />
          </div>

          {/* Content */}
          <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div>
              <span className="inline-block bg-[#FFF3E8] text-[#F97316] text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
                {t('landingTrustBadge')}
              </span>
            </div>
            <h2 className="text-3xl sm:text-[2.4rem] font-extrabold text-gray-900 tracking-tight leading-tight">
              {t('landingTrustTitle')}
            </h2>
            <p className="text-gray-500 leading-relaxed text-[0.95rem]">
              {t('landingTrustSubtitle')}
            </p>

            <ul className="space-y-3 py-1">
              {POINTS.map(key => (
                <li key={key} className={`flex items-center gap-3 text-gray-700 text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle2 size={18} className="text-[#F97316] flex-shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>

            <Link href="/products"
              className={`inline-flex items-center gap-2.5 bg-[#F97316] hover:bg-[#e8650a] text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-lg shadow-[#F97316]/20 hover:-translate-y-0.5 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              {t('landingTrustCta')}
              <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </Link>

            {/* Mini stats */}
            <div className={`flex items-center gap-8 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {stats.map((s, i) => (
                <div key={i} className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.v}</p>
                  <p className="text-gray-500 text-xs font-medium mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
"""

# ─── CTASection ──────────────────────────────────────────────────────────────
files["CTASection.tsx"] = """\
'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CTASection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-20 bg-[#F97316] relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          {t('landingCtaTitle')}
        </h2>
        <p className="text-orange-100 text-lg max-w-2xl mx-auto leading-relaxed">
          {t('landingCtaSubtitle')}
        </p>
        <div className={`flex flex-wrap justify-center gap-4 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href="/products"
            className="inline-flex items-center gap-2.5 bg-white text-[#F97316] font-bold px-8 py-4 rounded-full hover:bg-orange-50 transition-all shadow-2xl shadow-orange-900/20 hover:-translate-y-0.5 text-sm">
            <ShoppingBag size={18} />
            {t('landingCtaBtn1')}
          </Link>
          <a href="https://wa.me/966506814416" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-full transition-all shadow-2xl shadow-green-900/20 hover:-translate-y-0.5 text-sm">
            <MessageCircle size={18} />
            {t('landingCtaBtn2')}
          </a>
        </div>
      </div>
    </section>
  );
}
"""

# ─── ContactSection ──────────────────────────────────────────────────────────
files["ContactSection.tsx"] = """\
'use client';

import React from 'react';
import { Phone, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ContactSection() {
  const { t, isRTL } = useLanguage();

  const contacts = [
    { Icon: Phone,         label: t('landingContactPhone'),    value: '+966 50 681 4416', href: 'tel:+966506814416',             bg: 'bg-[#1E293B]' },
    { Icon: MessageCircle, label: t('landingContactWhatsapp'), value: '+966 50 681 4416', href: 'https://wa.me/966506814416',    bg: 'bg-[#1E293B]' },
    { Icon: MapPin,        label: t('landingContactLocation'), value: t('landingContactLocationValue'), href: '#',               bg: 'bg-[#1E293B]' },
  ];

  return (
    <section id="contact" className="py-20 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14 space-y-3">
          <div>
            <span className="inline-block bg-[#FFF3E8] text-[#F97316] text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
              {t('landingContactBadge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-[2.4rem] font-extrabold text-gray-900 tracking-tight">
            {t('landingContactTitle')}
          </h2>
          <p className="text-gray-500 text-base">{t('landingContactSubtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {contacts.map(({ Icon, label, value, href, bg }, i) => (
            <a key={i} href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`${bg} rounded-2xl p-7 flex flex-col items-center text-center gap-5 hover:scale-[1.03] transition-transform shadow-lg`}
            >
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                <Icon size={26} className="text-white" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{label}</p>
                <p className="text-white font-bold text-lg leading-snug" dir="ltr">{value}</p>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
"""

# ─── LandingFooter ───────────────────────────────────────────────────────────
files["LandingFooter.tsx"] = """\
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
"""

# Write all files
for name, content in files.items():
    path = BASE + name
    with open(path, 'w') as fh:
        fh.write(content)
    print(f"✓ {name}")

print("\nAll components written successfully!")
