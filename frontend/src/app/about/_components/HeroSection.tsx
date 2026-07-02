'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/helpers';

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
          src={isRTL ? '/images/landing/Hero section arabic image.png' : (getImageUrl('uploads/New landing pages images/Hero Section Image.png') || '/images/landing/Hero Section Image.png')}
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
          <div className="w-full space-y-6" style={introStyle(0)}>
            <div style={introStyle(100)}>
              <span className="inline-block px-4 py-2 bg-[#123C9C] text-white text-xs font-bold rounded-full mb-4">
                {t('aboutHeroBadge') || 'About SHIELDER'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white" style={introStyle(150)}>
              <span className="block mb-2">{t('aboutHeroTitle')?.split('.')[0] || 'ABOUT SHIELDER'}</span>
            </h1>

            <p className="text-base sm:text-lg font-normal leading-relaxed text-gray-200 max-w-[500px]" style={introStyle(200)}>
              {t('aboutHeroSubtitle') || 'Built to Protect. Engineered to Perform. Since 1994.'}
            </p>

            <p className="text-sm sm:text-base text-gray-300 max-w-[600px]" style={introStyle(250)}>
              {t('aboutHeroDescription') || 'Delivering premium filtration solutions for heavy-duty equipment and industrial applications for more than three decades.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2" style={introStyle(300)}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#123C9C] hover:bg-[#0D2F8C] text-white font-bold text-sm h-[48px] px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {t('aboutHeroCta') || 'Explore Products'}
                <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}