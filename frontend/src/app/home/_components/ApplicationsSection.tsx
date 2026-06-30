'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from './ScrollReveal';

const APPLICATIONS = [
  {
    titleKey: 'landingApp1Title',
    image: '/images/landing/heavy duty trucks.png',
  },
  {
    titleKey: 'landingApp2Title',
    image: '/images/landing/Construction.jpeg',
  },
  {
    titleKey: 'landingApp3Title',
    image: '/images/landing/heavy duty trucks.png',
  },
  {
    titleKey: 'landingApp4Title',
    image: '/images/landing/Construction.jpeg',
  },
  {
    titleKey: 'landingApp5Title',
    image: '/images/landing/heavy duty trucks.png',
  },
  {
    titleKey: 'landingApp6Title',
    image: '/images/landing/Construction.jpeg',
  },
];

export default function ApplicationsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="py-20 bg-white" delayMs={30} threshold={0.15} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0A1E36] tracking-tight">
              {t('landingAppTitle') || 'BUILT FOR EVERY APPLICATION'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              {t('landingAppSubtitle') || 'Our filters are trusted in a wide range of industries and equipment.'}
            </p>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {APPLICATIONS.map((app, i) => (
              <div
                key={i}
                className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <Image
                    src={app.image}
                    alt={t(app.titleKey)}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent group-hover:from-black/95 transition-all duration-300" />
                </div>

                {/* Title */}
                <div className="absolute inset-0 flex items-end p-4 sm:p-5">
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-1">
                      {t(app.titleKey)}
                    </h3>
                    <div className="w-8 h-1 bg-[#123C9C] rounded-full group-hover:w-12 transition-all duration-300"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}