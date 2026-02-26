'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ContactSection() {
  const { t, isRTL } = useLanguage();

  const contacts = [
    { label: t('landingContactPhone'),    value: '+966 50 681 4416',            href: 'tel:+966506814416'          },
    { label: t('landingContactWhatsapp'), value: '+966 50 681 4416',            href: 'https://wa.me/966506814416' },
    { label: t('landingContactLocation'), value: t('landingContactLocationValue'), href: '#'                       },
  ];

  return (
    <section id="contact" className="py-24 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div>
            <span className="inline-block bg-[#F97316] text-white text-sm font-semibold px-6 py-2 rounded-md">
              {t('landingContactBadge')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t('landingContactTitle')}
          </h2>
          <p className="text-gray-500 text-base sm:text-lg">{t('landingContactSubtitle')}</p>
        </div>

        {/* Cards — full width, 3 columns */}
        <div className="grid sm:grid-cols-3 gap-5">
          {contacts.map(({ label, value, href }, i) => (
            <a
              key={i}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="bg-[#0D1637] rounded-2xl py-10 px-8 flex flex-col items-center justify-center text-center gap-2 hover:bg-[#0f1d4a] transition-colors shadow-md"
            >
              <p className="text-white font-bold text-xl">{label}</p>
              <p className="text-white/70 text-base font-medium" dir="ltr">{value}</p>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
