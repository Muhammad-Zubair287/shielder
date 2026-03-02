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
      className="pt-16 bg-white"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Centered text content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center space-y-5">

        {/* Badge */}
        <div>
          <span className="inline-block bg-[#F97316] text-white text-sm font-semibold px-5 py-1.5 rounded-full">
            {t('landingHeroBadge')}
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight">
          {t('landingHeroTitle')}
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 text-base sm:text-[1.05rem] leading-relaxed max-w-xl mx-auto">
          {t('landingHeroSubtitle')}
        </p>

        {/* Buttons */}
        <div className={`flex flex-wrap items-center justify-center gap-3 pt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href="/products"
            className="inline-flex items-center bg-[#0205A6] hover:bg-[#0307c4] text-white font-semibold px-7 py-2.5 rounded-full transition-all text-sm shadow-md">
            {t('landingHeroCta')}
          </Link>
          <Link href="#contact"
            className="inline-flex items-center border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-7 py-2.5 rounded-full transition-all text-sm hover:bg-gray-50">
            {t('landingHeroCtaSecondary')}
          </Link>
        </div>
      </div>

      {/* ── Hero image block ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-0 relative">

        {/* Rating — floats over the top-left of the image */}
        <div className={`absolute top-0 z-10 ${isRTL ? 'right-6 sm:right-8' : 'left-6 sm:left-8'} -translate-y-1/2`}>
          <div className="bg-white rounded-xl shadow-lg px-4 py-2.5 flex flex-col gap-0.5">
            <p className="text-[#F97316] font-bold text-sm whitespace-nowrap">{t('landingHeroRatingText')}</p>
            <div className={`flex gap-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>

        {/* Image — source is 512×512, use contain + dark bg to avoid upscale blur */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl w-full bg-gray-900">
          <div className="relative w-full" style={{ paddingBottom: '68%' }}>
            <Image
              src="/images/landing/herosection-upgrade image.png"
              alt={t('landingHeroImageAlt')}
              fill priority
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
            />
          </div>

          {/* Bottom-right caption overlay */}
          <div className={`absolute bottom-4 ${isRTL ? 'left-4' : 'right-4'}`}>
            <div className={`bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3.5 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Text */}
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-white font-bold text-sm leading-tight">Our 1k Client Satisfied</p>
                <p className="text-white/70 font-medium text-xs mt-0.5">With Our Recent Work</p>
              </div>
              {/* Avatars */}
              <div className={`flex flex-shrink-0 ${isRTL ? '-space-x-reverse' : ''} -space-x-2`}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="relative w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-slate-600 flex-shrink-0">
                    <Image src={`/images/landing/user-${i}.jpg`} alt="" fill className="object-cover" sizes="36px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
