'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';

export default function CTABanner() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#0A1E36] to-[#123C9C] rounded-3xl p-12 lg:p-16 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 tracking-tight">
                {t('aboutCtaTitle') || 'Ready to Protect Your Equipment?'}
              </h2>
              <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto mb-10">
                {t('aboutCtaSubtitle') || 'Discover high-performance filtration solutions trusted by industries worldwide.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 bg-white text-[#0A1E36] hover:bg-gray-100 font-bold text-sm h-[52px] px-10 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {t('aboutCtaButton1') || 'View Products'}
                  <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#0A1E36] font-bold text-sm h-[52px] px-10 rounded-lg transition-all duration-300"
                >
                  {t('aboutCtaButton2') || 'Request Quotation'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}