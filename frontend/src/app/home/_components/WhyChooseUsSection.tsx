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
    <section className="py-24 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header — centered */}
        <div className="text-center mb-16 space-y-4">
          <div>
            <span className="inline-block bg-[#F97316] text-white text-sm font-semibold px-6 py-2 rounded-md">
              {t('landingWhyBadge')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t('landingWhyTitle')}
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('landingWhySubtitle')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-start gap-4 hover:shadow-lg transition-shadow duration-300">
              {/* Icon in orange circle border */}
              <div className="w-16 h-16 rounded-full border-2 border-[#F97316] flex items-center justify-center flex-shrink-0">
                <Icon size={30} className="text-[#F97316]" strokeWidth={1.6} />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{t(titleKey)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
