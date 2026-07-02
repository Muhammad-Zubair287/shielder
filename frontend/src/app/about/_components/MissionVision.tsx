'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';
import { Target, Eye } from 'lucide-react';

export default function MissionVision() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-gray-50" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-[#004A99] font-semibold text-sm tracking-[0.2em] uppercase mb-4">
              {t('aboutOurPurpose') || 'Our Purpose'}
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] mb-4">
              {t('aboutMissionVisionTitle') || 'Mission & Vision'}
            </h2>
            <div className="w-20 h-1 bg-[#004A99] mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Mission Card */}
            <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#0205A6] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target size={28} className="text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-extrabold text-[#004A99]">
                  {t('aboutMissionTitle') || 'Our Mission'}
                </h3>
              </div>
              <p className="text-gray-700 text-base leading-relaxed">
                {t('aboutMissionText') || 'To provide world-class filtration solutions that protect equipment, enhance performance, and exceed customer expectations through continuous innovation, uncompromising quality, and exceptional service.'}
              </p>
            </div>

            {/* Vision Card */}
            <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#123C9C] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye size={28} className="text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-extrabold text-[#004A99]">
                  {t('aboutVisionTitle') || 'Our Vision'}
                </h3>
              </div>
              <p className="text-gray-700 text-base leading-relaxed">
                {t('aboutVisionText') || 'To be the global leader in industrial filtration, recognized for innovation, reliability, and sustainability. We aspire to set the industry standard while building lasting partnerships with customers worldwide.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}