'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ScrollReveal from '@/app/home/_components/ScrollReveal';

interface StatItem {
  key: string;
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  {
    key: 'aboutStatYears',
    value: 30,
    suffix: '+',
    label: 'Years Experience'
  },
  {
    key: 'aboutStatProducts',
    value: 1000,
    suffix: '+',
    label: 'Products'
  },
  {
    key: 'aboutStatCustomers',
    value: 500,
    suffix: '+',
    label: 'Customers'
  },
  {
    key: 'aboutStatCategories',
    value: 6,
    suffix: '+',
    label: 'Product Categories'
  }
];

function AnimatedCounter({ target, suffix, duration = 2000 }: { target: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * target));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <div ref={counterRef} className="text-center">
      <div className="text-5xl lg:text-6xl font-extrabold text-[#0205A6] mb-2">
        {count}{suffix}
      </div>
    </div>
  );
}

export default function StatisticsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <ScrollReveal className="bg-white" delayMs={30} threshold={0.16} durationMs={1000}>
      <section dir={isRTL ? 'rtl' : 'ltr'} className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0A1E36] tracking-tight mb-4">
              {t('aboutStatsTitle') || 'SHIELDER by the Numbers'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('aboutStatsSubtitle') || 'A legacy of excellence and growth'}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat) => (
              <div
                key={stat.key}
                className="bg-gray-50 rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <AnimatedCounter
                  target={stat.value}
                  suffix={stat.suffix}
                  duration={2000}
                />
                <p className="text-gray-600 text-base font-medium mt-4">
                  {t(stat.key) || stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}