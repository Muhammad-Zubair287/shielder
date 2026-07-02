'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/helpers';
import ScrollReveal from '@/app/home/_components/ScrollReveal';

const industries = [
  {
    key: 'aboutIndustry1',
    title: 'Heavy Duty Trucks',
    image: 'heavy duty trucks.png'
  },
  {
    key: 'aboutIndustry2',
    title: 'Construction',
    image: 'Construction.jpeg'
  },
  {
    key: 'aboutIndustry3',
    title: 'Mining',
    image: 'mining 1.jpeg'
  },
  {
    key: 'aboutIndustry4',
    title: 'Agriculture',
    image: 'agriculture.png'
  },
  {
    key: 'aboutIndustry5',
    title: 'Power Generation',
    image: 'power generation.png'
  },
  {
    key: 'aboutIndustry6',
    title: 'Industrial Plants',
    image: 'industrial.png'
  }
];

export default function IndustriesSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#004A99] tracking-tight mb-4">
              {t('aboutIndustriesTitle') || 'Industries We Serve'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('aboutIndustriesSubtitle') || 'Providing filtration solutions across diverse industrial sectors'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((industry, index) => (
              <div
                key={industry.key}
                className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                style={{ aspectRatio: '4/3' }}
              >
                <Image
                  src={industry.image ? getImageUrl(`uploads/New landing pages images/${industry.image}`) || `/images/landing/${industry.image}` : '/images/landing/Landing page.jpeg'}
                  alt={t(industry.key) || industry.title}
                  fill
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1E36]/90 via-[#0A1E36]/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white">
                    {t(industry.key) || industry.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}