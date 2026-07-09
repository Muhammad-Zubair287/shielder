'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from './ScrollReveal';

const POINTS = [
  'landingWhyPoint1',
  'landingWhyPoint2',
  'landingWhyPoint3',
  'landingWhyPoint4',
] as const;

export default function WhyChooseUsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Content - Left side (or right in RTL) */}
            <div className={`space-y-8 ${isRTL ? 'lg:order-last' : ''}`}>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight leading-tight">
                {(() => {
                  const title = t('landingWhyTitle') || 'WHY CHOOSE SHIELDER?';
                  const words = title.split(' ');
                  if (words.length > 2) {
                    return (
                      <>
                        {words.slice(0, 2).join(' ')}
                        <br />
                        {words.slice(2).join(' ')}
                      </>
                    );
                  }
                  return title;
                })()}
              </h2>

              <ul className="space-y-5 pt-2">
                {POINTS.map(key => (
                  <li key={key} className="flex items-start gap-4">
                    <CheckCircle2 
                      size={22} 
                      className="text-[#0205A6] flex-shrink-0 mt-0.5" 
                      strokeWidth={1.5}
                      fill="none"
                    />
                    <span className="text-gray-700 text-base font-medium leading-relaxed">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/products"
                className={`inline-flex items-center gap-2.5 bg-[#0205A6] hover:bg-[#0104a0] text-white font-bold px-8 py-4 rounded-lg transition-all duration-200 text-sm mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {t('landingWhyCta') || 'LEARN MORE ABOUT US'}
                <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
              </Link>
            </div>

            {/* Image - Right side (or left in RTL) */}
            <div className={`relative ${isRTL ? 'lg:order-first' : ''}`}>
              <Image
                src="/images/landing/Why choose us section image.png"
                alt={t('landingWhyImageAlt') || 'Why Choose Shielder'}
                width={600}
                height={500}
                className="object-contain w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}