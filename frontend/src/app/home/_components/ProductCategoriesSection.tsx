'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = [
  { nameKey: 'landingCat1Name', descKey: 'landingCat1Desc', countKey: 'landingCat1ProductCount', image: '/images/landing/factory-1.png', href: '/products?category=air' },
  { nameKey: 'landingCat2Name', descKey: 'landingCat2Desc', countKey: 'landingCat2ProductCount', image: '/images/landing/factory-2.png', href: '/products?category=diesel' },
  { nameKey: 'landingCat3Name', descKey: 'landingCat3Desc', countKey: 'landingCat3ProductCount', image: '/images/landing/factory-3.png', href: '/products?category=oil' },
];

export default function ProductCategoriesSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-24 bg-[#0205A6]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div>
            <span className="inline-block bg-[#F97316] text-white text-sm font-semibold px-6 py-2 rounded-md">
              {t('landingCatBadge')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {t('landingCatTitle')}
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('landingCatSubtitle')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={cat.image}
                  alt={t(cat.nameKey)}
                  fill unoptimized
                  className="object-cover"
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                />
              </div>
              {/* Body */}
              <div className={`p-6 flex flex-col gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {/* Count badge */}
                <span className="text-[#F97316] text-xs font-semibold">{t(cat.countKey)}</span>
                <h3 className="text-gray-900 font-bold text-xl">{t(cat.nameKey)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">{t(cat.descKey)}</p>
                {/* View Product button */}
                <Link
                  href={cat.href}
                  className="block w-full text-center border border-gray-300 hover:border-[#0205A6] hover:text-[#0205A6] text-gray-700 font-semibold text-sm py-2.5 rounded-full transition-colors"
                >
                  {t('landingCatViewProduct')}
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
