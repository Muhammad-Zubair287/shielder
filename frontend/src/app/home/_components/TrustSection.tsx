'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const POINTS = [
  'landingTrustPoint1','landingTrustPoint2','landingTrustPoint3',
  'landingTrustPoint4','landingTrustPoint5','landingTrustPoint6',
] as const;

export default function TrustSection() {
  const { t, isRTL } = useLanguage();

  const stats = [
    { v: t('landingTrustStat1Value'), l: t('landingTrustStat1Label') },
    { v: t('landingTrustStat2Value'), l: t('landingTrustStat2Label') },
    { v: t('landingTrustStat3Value'), l: t('landingTrustStat3Label') },
  ];

  return (
    <section className="py-20 bg-[#F8FAFC]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-start">

          {/* Image */}
          <div className={`relative ${isRTL ? 'lg:order-last' : ''}`}>
            <div className="relative rounded-2xl overflow-hidden aspect-[1.1/1] shadow-2xl shadow-slate-200">
              <Image src="/images/landing/hero-robot.png" alt={t('landingTrustImageAlt')} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/10 to-transparent" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-28 h-28 bg-[#F97316]/10 rounded-2xl -z-10" />
            <div className="absolute -top-4 -left-4 w-14 h-14 border border-[#F97316]/20 rounded-xl -z-10" />
          </div>

          {/* Content */}
          <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div>
              <span className="inline-block bg-[#FFF3E8] text-[#F97316] text-[11px] font-bold px-5 py-2 rounded-full uppercase tracking-[0.15em]">
                {t('landingTrustBadge')}
              </span>
            </div>
            <h2 className="text-3xl sm:text-[2.4rem] font-extrabold text-gray-900 tracking-tight leading-tight">
              {t('landingTrustTitle')}
            </h2>
            <p className="text-gray-500 leading-relaxed text-[0.95rem]">
              {t('landingTrustSubtitle')}
            </p>

            <ul className="space-y-3 py-1">
              {POINTS.map(key => (
                <li key={key} className={`flex items-center gap-3 text-gray-700 text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle2 size={18} className="text-[#F97316] flex-shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>

            <Link href="/products"
              className={`inline-flex items-center gap-2.5 bg-[#F97316] hover:bg-[#e8650a] text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-lg shadow-[#F97316]/20 hover:-translate-y-0.5 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              {t('landingTrustCta')}
              <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </Link>

            {/* Mini stats */}
            <div className={`flex items-center gap-8 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {stats.map((s, i) => (
                <div key={i} className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.v}</p>
                  <p className="text-gray-500 text-xs font-medium mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
