'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CTASection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-20 bg-[#F97316] relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          {t('landingCtaTitle')}
        </h2>
        <p className="text-orange-100 text-lg max-w-2xl mx-auto leading-relaxed">
          {t('landingCtaSubtitle')}
        </p>
        <div className={`flex flex-wrap justify-center gap-4 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href="/products"
            className="inline-flex items-center gap-2.5 bg-white text-[#F97316] font-bold px-8 py-4 rounded-full hover:bg-orange-50 transition-all shadow-2xl shadow-orange-900/20 hover:-translate-y-0.5 text-sm">
            <ShoppingBag size={18} />
            {t('landingCtaBtn1')}
          </Link>
          <a href="https://wa.me/966506814416" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-full transition-all shadow-2xl shadow-green-900/20 hover:-translate-y-0.5 text-sm">
            <MessageCircle size={18} />
            {t('landingCtaBtn2')}
          </a>
        </div>
      </div>
    </section>
  );
}
