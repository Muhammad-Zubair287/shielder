'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';
import { Factory, Rocket, Cpu, Globe, CheckCircle, TrendingUp } from 'lucide-react';

const timelineEvents = [
  {
    key: 'aboutTimeline1994',
    year: '1994',
    icon: Factory,
    title: 'Company Founded',
    description: 'Company established with a focus on filtration solutions for diesel engines and industrial equipment.'
  },
  {
    key: 'aboutTimeline2000',
    year: '2000',
    icon: Rocket,
    title: 'Product Expansion',
    description: 'Expanded product portfolio to serve transportation and heavy equipment sectors.'
  },
  {
    key: 'aboutTimeline2008',
    year: '2008',
    icon: Cpu,
    title: 'Advanced Filtration Technology',
    description: 'Introduced advanced filtration technologies to meet evolving engine requirements.'
  },
  {
    key: 'aboutTimeline2015',
    year: '2015',
    icon: Globe,
    title: 'Regional Expansion',
    description: 'Expanded distribution network to serve customers across multiple regional markets.'
  },
  {
    key: 'aboutTimeline2020',
    year: '2020',
    icon: CheckCircle,
    title: 'Quality Control Enhancement',
    description: 'Enhanced quality control systems and broadened coverage for power generation and industrial applications.'
  },
  {
    key: 'aboutTimelineToday',
    year: 'Today',
    icon: TrendingUp,
    title: 'Trusted Global Filtration Partner',
    description: 'A trusted filtration partner serving diverse industries with a comprehensive range of premium filtration products.'
  }
];

export default function CompanyTimeline() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-gray-50" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight mb-4">
              {t('aboutTimelineTitle') || 'Our Journey'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('aboutTimelineSubtitle') || 'Three decades of innovation, quality, and growth'}
            </p>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-[#0205A6] to-[#123C9C]"></div>

            {/* Timeline Events */}
            <div className="space-y-6 md:space-y-0">
              {timelineEvents.map((event, index) => {
                const Icon = event.icon;
                const isEven = index % 2 === 0;

                return (
                  <div key={event.year} className="relative">
                    {/* Mobile Card */}
                    <div className="md:hidden">
                      <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#0205A6] rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon size={24} className="text-white" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1">
                            <div className="text-2xl font-extrabold text-[#123C9C] mb-2">
                              {event.year}
                            </div>
                            <h3 className="text-xl font-bold text-[#0A1E36] mb-2">
                              {t(event.key) || event.title}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {t(`${event.key}Desc`) || event.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:block w-full">
                      {/* Center Dot */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#0205A6] rounded-full border-4 border-white shadow-lg z-10"></div>

                      {/* Card with alternating alignment */}
                      <div className={`flex ${isEven ? 'justify-start' : 'justify-end'}`}>
                        <div className={`w-5/12 ${isEven ? 'mr-12' : 'ml-12'}`}>
                          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-[#0205A6] rounded-xl flex items-center justify-center flex-shrink-0">
                                <Icon size={24} className="text-white" strokeWidth={1.5} />
                              </div>
                              <div className="flex-1">
                                <div className="text-2xl font-extrabold text-[#123C9C] mb-2">
                                  {event.year}
                                </div>
                                <h3 className="text-xl font-bold text-[#0A1E36] mb-2">
                                  {t(event.key) || event.title}
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                  {t(`${event.key}Desc`) || event.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
