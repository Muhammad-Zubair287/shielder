'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';
import { Shield, Users, Lightbulb, Award, Handshake, Star } from 'lucide-react';

const values = [
  {
    icon: Shield,
    key: 'aboutValue1',
    title: 'Quality Without Compromise',
    description: 'We maintain the highest standards in every product we manufacture, ensuring reliability and performance.'
  },
  {
    icon: Users,
    key: 'aboutValue2',
    title: 'Customer First',
    description: 'Our customers are at the heart of everything we do. We build lasting relationships through exceptional service.'
  },
  {
    icon: Lightbulb,
    key: 'aboutValue3',
    title: 'Continuous Innovation',
    description: 'We invest in research and development to stay ahead of industry trends and deliver cutting-edge solutions.'
  },
  {
    icon: Award,
    key: 'aboutValue4',
    title: 'Integrity & Accountability',
    description: 'We conduct business with honesty, transparency, and unwavering ethical standards.'
  },
  {
    icon: Handshake,
    key: 'aboutValue5',
    title: 'Long-Term Partnerships',
    description: 'We value enduring relationships with customers, suppliers, and stakeholders built on mutual trust.'
  },
  {
    icon: Star,
    key: 'aboutValue6',
    title: 'Professional Excellence',
    description: 'Our team of experts brings deep industry knowledge and commitment to every project.'
  }
];

export default function CoreValues() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight mb-4">
              {t('aboutValuesTitle') || 'Our Core Values'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('aboutValuesSubtitle') || 'The principles that guide everything we do at SHIELDER'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.key}
                  className="bg-gray-50 rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-[#0205A6] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#123C9C] transition-colors duration-300">
                    <Icon size={32} className="text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0A1E36] mb-3">
                    {t(value.key) || value.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {t(`${value.key}Desc`) || value.description}
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