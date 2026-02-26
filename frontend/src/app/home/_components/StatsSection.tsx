'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Parse a stat value string like "150+", "1000+", "15+", "24/7"
 *  Returns { prefix, target, suffix } so we can animate `target`.
 */
function parseStatValue(value: string): { prefix: string; target: number; suffix: string } {
  // Match optional leading digits, then optional non-digit suffix (e.g. "+", "/7")
  const match = value.match(/^(\D*)(\d+)(.*)$/);
  if (!match) return { prefix: '', target: 0, suffix: value };
  return { prefix: match[1], target: parseInt(match[2], 10), suffix: match[3] };
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target === 0) return;

    let start: number | null = null;
    const startVal = 0;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startVal + eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [active, target, duration]);

  return count;
}

interface AnimatedStatProps {
  rawValue: string;
  label: string;
  isRTL: boolean;
  active: boolean;
  index: number;
}

function AnimatedStat({ rawValue, label, isRTL, active, index }: AnimatedStatProps) {
  const { prefix, target, suffix } = parseStatValue(rawValue);

  // Stagger each card by 150ms
  const [localActive, setLocalActive] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLocalActive(true), index * 150);
    return () => clearTimeout(timer);
  }, [active, index]);

  const displayCount = useCountUp(target, 1800, localActive);

  return (
    <div
      className={`flex items-center gap-3 px-6 first:pl-0 last:pr-0 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
        <CheckCircle size={20} className="text-emerald-400" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none tabular-nums">
          {isRTL
            ? `${suffix}${localActive ? displayCount : 0}${prefix}`
            : `${prefix}${localActive ? displayCount : 0}${suffix}`}
        </p>
        <p className="text-slate-400 text-xs font-medium mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export default function StatsSection() {
  const { t, isRTL } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const stats = [
    { value: t('landingStat1Value'), label: t('landingStat1Label') },
    { value: t('landingStat2Value'), label: t('landingStat2Label') },
    { value: t('landingStat3Value'), label: t('landingStat3Label') },
    { value: t('landingStat4Value'), label: t('landingStat4Label') },
  ];

  return (
    <section ref={sectionRef} className="bg-[#0205A6] py-7" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
          {stats.map((s, i) => (
            <AnimatedStat
              key={i}
              rawValue={s.value}
              label={s.label}
              isRTL={isRTL}
              active={hasAnimated}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
