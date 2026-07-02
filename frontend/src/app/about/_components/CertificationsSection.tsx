'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';
import { CheckCircle, Award, Shield, FileCheck } from 'lucide-react';

const certifications = [
  {
    icon: Award,
    key: 'aboutCert1',
    title: 'Quality Tested',
    description: 'Every product undergoes rigorous testing to ensure superior performance and durability.'
  },
  {
    icon: Shield,
    key: 'aboutCert2',
    title: 'Premium Manufacturing',
    description: 'State-of-the-art facilities with ISO-certified manufacturing processes.'
  },
  {
    icon: CheckCircle,
    key: 'aboutCert3',
    title: 'Performance Validated',
    description: 'Products validated under extreme conditions for maximum reliability.'
  },
  {
    icon: FileCheck,
    key: 'aboutCert4',
    title: 'Industry Standards',
    description: 'Compliant with international quality and safety standards.'
  }
];

export default function CertificationsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-gray-50" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight mb-4">
              {t('aboutCertTitle') || 'Certifications & Quality'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('aboutCertSubtitle') || 'Committed to the highest standards of quality and excellence'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {certifications.map((cert, index) => {
              const Icon = cert.icon;
              return (
                <div
                  key={cert.key}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-20 h-20 bg-[#0205A6] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon size={40} className="text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0A1E36] mb-3">
                    {t(cert.key) || cert.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {t(`${cert.key}Desc`) || cert.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}