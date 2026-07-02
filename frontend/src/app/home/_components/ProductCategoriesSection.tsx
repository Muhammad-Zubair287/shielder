'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories } from '@/hooks/useCategories';
import ScrollReveal from './ScrollReveal';

// 6 categories matching the new design - using new landing page images
const CATEGORIES = [
  { nameKey: 'landingCat1Name', descKey: 'landingCat1Desc', keyword: 'air', image: '/images/landing/air filter new.png', href: '/products?category=air' },
  { nameKey: 'landingCat2Name', descKey: 'landingCat2Desc', keyword: 'oil', image: '/images/landing/oil filter.png', href: '/products?category=oil' },
  { nameKey: 'landingCat3Name', descKey: 'landingCat3Desc', keyword: 'fuel', image: '/images/landing/filter image 2.png', href: '/products?category=fuel' },
  { nameKey: 'landingCat4Name', descKey: 'landingCat4Desc', keyword: 'hydraulic', image: '/images/landing/Hydrulic Filter.png', href: '/products?category=hydraulic' },
  { nameKey: 'landingCat5Name', descKey: 'landingCat5Desc', keyword: 'cabin', image: '/images/landing/cabin filter.png', href: '/products?category=cabin' },
  { nameKey: 'landingCat6Name', descKey: 'landingCat6Desc', keyword: 'coolant', image: '/images/landing/coolent filter.png', href: '/products?category=coolant' },
];

export default function ProductCategoriesSection() {
  const { t, isRTL, locale } = useLanguage();
  const { categories } = useCategories(locale || 'en');

  const counts: (number | null)[] = CATEGORIES.map(({ keyword }) => {
    const match = categories.find(c =>
      c.name?.toLowerCase().includes(keyword.toLowerCase())
    );
    return match?.productCount ?? null;
  });

  const countLabel = (idx: number): string => {
    const n = counts[idx];
    if (n === null) return t(`landingCat${idx + 1}ProductCount`);
    return isRTL ? `+${n} منتج` : `${n}+ Products`;
  };

  return (
    <ScrollReveal className="py-20 bg-white" delayMs={30} threshold={0.15} durationMs={1000} effect="fade-up">
      <section dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0A1E36] tracking-tight">
              {t('landingCatTitle') || 'BROWSE FILTERS BY CATEGORY'}
            </h2>
          </div>

          {/* Cards Grid - 6 columns on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {CATEGORIES.map((cat, i) => (
              <div key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300" style={{ transitionDelay: `${i * 80}ms` }}>
                {/* Image */}
                <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-50">
                  <Image
                    src={cat.image}
                    alt={t(cat.nameKey)}
                    fill
                    className="object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
                  />
                </div>
                 {/* Body */}
                 <div className={`p-4 sm:p-5 flex flex-col gap-2 ${isRTL ? 'text-right' : 'text-start'}`}>
                   <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{t(cat.nameKey)}</h3>
                   <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-2">{t(cat.descKey)}</p>
                   <Link
                     href={cat.href}
                     className="text-[#0205A6] text-xs sm:text-sm font-bold hover:underline inline-flex items-center gap-1.5"
                   >
                     {t('landingCatShopNow') || 'SHOP NOW'}
                     <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
                   </Link>
                 </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </ScrollReveal>
  );
}