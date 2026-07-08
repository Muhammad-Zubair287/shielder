'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/helpers';
import ScrollReveal from '@/app/home/_components/ScrollReveal';

export default function CompanyStory() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Content - Left side (or right in RTL) */}
            <div className={`space-y-6 ${isRTL ? 'lg:order-last' : ''}`}>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight leading-tight">
                {t('aboutStoryTitle') || 'Our Story'}
              </h2>
              {/* <p className="text-base text-gray-700 leading-relaxed">
                {t('aboutStoryP1') || 'Founded in 1994, SHIELDER was built on a simple principle: deliver filtration solutions that customers can trust in the most demanding environments. What began as a specialized supplier of filtration products has grown into a trusted brand serving industries across power generation, transportation, construction, mining, agriculture, and industrial applications.'}
              </p> */}
              <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP2') || 'For more than three decades, we have dedicated ourselves to developing high-performance filters that protect engines, hydraulic systems, fuel systems, and critical equipment from contamination and wear. Our commitment to quality, reliability, and continuous improvement has enabled us to become a preferred choice for professionals who depend on maximum uptime and equipment protection.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP3') || 'Throughout our journey, we have expanded our product range to include air filters, oil filters, fuel filters, hydraulic filters, cabin filters, and coolant filters designed to meet the requirements of modern engines and heavy-duty equipment. Every product is engineered to deliver superior filtration efficiency, longer service life, and dependable performance under the toughest operating conditions.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP4') || 'Today, SHIELDER proudly serves customers across multiple sectors, supporting generator sets, heavy-duty trucks, construction machinery, agricultural equipment, mining operations, and industrial facilities. Our products are manufactured and tested according to stringent quality standards to ensure consistent performance and reliability.'}
              </p>
              {/* <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP5') || 'As we continue to grow, our mission remains unchanged: to provide innovative filtration solutions that extend equipment life, reduce operating costs, and help our customers achieve maximum productivity.'}
              </p> */}
            </div>

            {/* Image - Right side (or left in RTL) */}
            <div className={`relative ${isRTL ? 'lg:order-first' : ''}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={getImageUrl('uploads/New landing pages images/our story section image.png') || '/images/landing/Landing page.jpeg'}
                  alt={t('aboutStoryImageAlt') || 'SHIELDER manufacturing facility'}
                  width={600}
                  height={500}
                  className="object-cover w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}