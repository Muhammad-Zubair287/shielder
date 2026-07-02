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
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('aboutStoryP1') || 'Founded in 1994, SHIELDER has grown from a small filtration supplier to a global leader in industrial filtration solutions. For over three decades, we have been committed to delivering excellence in every filter we manufacture.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP2') || 'Our journey began with a simple mission: to provide high-quality, reliable filtration products that protect heavy-duty equipment and maximize performance. Today, we serve customers across multiple industries worldwide, maintaining the same dedication to quality and innovation that defined our early years.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed">
                {t('aboutStoryP3') || 'With state-of-the-art manufacturing facilities and a team of experienced engineers, SHIELDER continues to set industry standards for filtration technology, reliability, and customer service.'}
              </p>
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