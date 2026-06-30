'use client';

import React from 'react';
import { ShieldCheck, Settings, Truck, Headphones } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from './ScrollReveal';

const FEATURES = [
  {
    icon: ShieldCheck,
    titleKey: 'landingFeature1Title',
    descKey: 'landingFeature1Desc',
  },
  {
    icon: Settings,
    titleKey: 'landingFeature2Title',
    descKey: 'landingFeature2Desc',
  },
  {
    icon: Truck,
    titleKey: 'landingFeature3Title',
    descKey: 'landingFeature3Desc',
  },
  {
    icon: Headphones,
    titleKey: 'landingFeature4Title',
    descKey: 'landingFeature4Desc',
  },
];

export default function FeaturesBarSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-[#0A1E36] py-12" delayMs={30} threshold={0.2} durationMs={800}>
      <section dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map(({ icon: Icon, titleKey, descKey }, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Icon size={24} className="text-white" strokeWidth={1.5} />
                </div>
                {/* Text */}
                <div className={isRTL ? 'text-right' : 'text-start'}>
                  <h3 className="text-white font-bold text-sm mb-1">
                    {t(titleKey)}
                  </h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {t(descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}