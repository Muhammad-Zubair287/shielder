'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hero Section — /home
 * ─────────────────────────────────────────────────────────────────────────
 * New design: Full-width hero with background image and overlay
 */
export default function HeroSection() {
  const { t, isRTL } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const introStyle = (delayMs: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translate3d(0, 0, 0)' : 'translate3d(0, 12px, 0)',
    transition: 'opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${delayMs}ms`,
    willChange: 'opacity, transform',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden mt-[120px]"
      style={{ height: 'clamp(500px, 60vh, 600px)', minHeight: '500px' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={isRTL ? '/images/landing/Hero section arabic image.png' : '/images/landing/Hero Section Image.png'}
          alt="Industrial background"
          fill
          priority
          className={isRTL ? "object-cover object-left" : "object-cover object-center"}
          sizes="100vw"
        />
        <div className={isRTL ? "absolute inset-0 bg-gradient-to-b from-[#0A1E36]/70 via-[#0A1E36]/40 to-transparent" : "absolute inset-0 bg-gradient-to-r from-[#0A1E36]/95 via-[#0A1E36]/80 to-transparent"} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-8 h-full">
        <div className="flex items-center h-full">
          {/* Left Column - Text Content */}
          <div className="w-full space-y-6" style={introStyle(0)}>
            {/* Badge */}
            <div style={introStyle(100)}>
              <span className="inline-block px-4 py-2 bg-[#123C9C] text-white text-xs font-bold rounded-full mb-4">
                {t('landingHeroBadge') || 'Premium Filter Solutions'}
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white" style={introStyle(150)}>
              <span className="block mb-2">{t('landingHeroTitle')?.split('.')[0] || 'BUILT TO PROTECT'}.</span>
              <span className="block">{t('landingHeroTitle')?.split('.')[1]?.trim() || 'ENGINEERED TO PERFORM'}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg font-normal leading-relaxed text-gray-200 max-w-[500px]" style={introStyle(200)}>
              {t('landingHeroSubtitle') || 'Premium filtration solutions for heavy-duty engines and equipment. Built for reliability. Designed for performance.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2" style={introStyle(250)}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#123C9C] hover:bg-[#0D2F8C] text-white font-bold text-sm h-[48px] px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {t('landingHeroCta') || 'SHOP FILTERS'}
                <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
              </Link>
              {/* <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#0A1E36] font-bold text-sm h-[48px] px-8 rounded-lg transition-all duration-300"
              >
                {t('landingHeroCtaSecondary') || 'Contact Us'}
              </Link> */}
            </div>

            {/* Stats */}
            {/* <div className="flex flex-wrap items-center gap-6 pt-4" style={introStyle(300)}>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-white">{t('landingStat1Value') || '150+'}</div>
                <div className="text-xs text-gray-300">{t('landingStat1Label') || 'Products Available'}</div>
              </div>
              <div className="w-px h-8 bg-gray-500"></div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-white">{t('landingStat2Value') || '1000+'}</div>
                <div className="text-xs text-gray-300">{t('landingStat2Label') || 'Happy Customers'}</div>
              </div>
              <div className="w-px h-8 bg-gray-500"></div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-white">{t('landingStat3Value') || '15+'}</div>
                <div className="text-xs text-gray-300">{t('landingStat3Label') || 'Years Experience'}</div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
}
