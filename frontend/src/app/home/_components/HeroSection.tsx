'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ArrowRight, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hero Section — /home
 * ─────────────────────────────────────────────────────────────────────────
 * Animated gradient background with floating elements, CTA buttons, and
 * responsive hero image. Features smooth animations and modern design.
 */
export default function HeroSection() {
  const { t, isRTL } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      className="relative pt-20 pb-16 bg-white overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Animated gradient background orbs ── */}
      {mounted && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-slate-900/5 rounded-full blur-3xl animate-pulse animation-delay-2s" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#F97216]/5 rounded-full blur-3xl animate-pulse animation-delay-4s" />
        </>
      )}

      <div className="relative z-10">
      {/* ── Centered text content ── */}
        {/* Text content — with gradient text and smooth animations */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-center space-y-6">
          {/* Badge with animation */}
          <div className="animate-fade-in">
            <span className="inline-block bg-[#F97216] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-full shadow-lg hover:shadow-orange-500/30 hover:shadow-xl transition-all duration-300 cursor-default">
              {t('landingHeroBadge')}
            </span>
          </div>

          {/* Main heading with gradient text */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight animate-fade-in animation-delay-100">
            <span className="block text-[#0A1E36]">
              {t('landingHeroTitle')}
            </span>
          </h1>

          {/* Subtitle with animation */}
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto animate-fade-in animation-delay-200">
            {t('landingHeroSubtitle')}
          </p>

          {/* CTA Buttons with hover effects */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in animation-delay-300 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Link
              href="/products"
              className="group relative inline-flex items-center gap-2 bg-[#0205A6] hover:bg-[#0205A6]/90 text-white font-bold px-8 sm:px-9 py-3 sm:py-4 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              {t('landingHeroCta')}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#contact"
              className="group relative inline-flex items-center gap-2 border-2 border-[#0A1E36]/20 hover:border-[#0A1E36]/35 text-[#0A1E36] font-bold px-8 sm:px-9 py-3 sm:py-4 rounded-full transition-all duration-300 bg-white hover:bg-gray-50 hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              {t('landingHeroCtaSecondary')}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      {/* ── Hero image block with animations ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-0 relative animate-fade-in animation-delay-400">
        {/* Rating badge — floats with animation */}
        <div className={`absolute top-0 z-10 ${isRTL ? 'right-6 sm:right-8' : 'left-6 sm:left-8'} -translate-y-1/2 animate-bounce`} style={{animationDelay: '0.2s'}}>
          <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.10)] px-5 py-3 flex flex-col gap-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.14)] transition-all border border-gray-100">
            <p className="text-[#F97216] font-bold text-xs sm:text-sm whitespace-nowrap">{t('landingHeroRatingText')}</p>
            <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>

        {/* Hero image with gradient border and hover effect */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl group hover:shadow-3xl transition-all duration-500">
          {/* Gradient border wrapper */}
          <div className="absolute inset-0 bg-gradient-to-r from-shielder-primary via-shielder-secondary to-orange-500 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
          
          <div className="relative rounded-3xl overflow-hidden bg-white border border-gray-100">
            <div className="relative w-full" style={{ paddingBottom: '68%' }}>
              <Image
                src="/images/landing/herosection-upgrade image.png"
                alt={t('landingHeroImageAlt')}
                fill
                priority
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
              />
              {/* Overlay gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Bottom-right caption overlay with animation */}
            <div className={`absolute bottom-4 sm:bottom-6 ${isRTL ? 'left-4 sm:left-6' : 'right-4 sm:right-6'} group-hover:translate-y-0 translate-y-2 transition-all duration-500`}>
              <div className={`bg-gradient-to-r from-[#0A1E36] to-[#111827] backdrop-blur-xl border border-white/10 rounded-2xl px-5 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Text */}
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-white font-bold text-xs sm:text-sm leading-tight">Our 1k Client Satisfied</p>
                  <p className="text-white/70 font-medium text-xs mt-0.5">With Our Recent Work</p>
                </div>
                {/* Avatars */}
                <div className={`flex flex-shrink-0 ${isRTL ? '-space-x-reverse' : ''} -space-x-2`}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-slate-400 to-slate-600 flex-shrink-0 hover:scale-110 transition-transform">
                      <Image src={`/images/landing/user-${i}.jpg`} alt="" fill className="object-cover" sizes="36px" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
