'use client';

import React from 'react';
import AOS from 'aos';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  threshold?: number;
  effect?: 'fade-up' | 'fade-right' | 'fade-left' | 'zoom-in' | 'zoom-out';
}

export default function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  threshold = 0.18,
  effect = 'fade-up',
}: ScrollRevealProps) {
  // Map prior threshold semantics into an approximate AOS trigger offset.
  const aosOffset = Math.max(0, Math.round((1 - threshold) * 120));

  React.useEffect(() => {
    AOS.refreshHard();
  }, []);

  return (
    <div
      className={className}
      data-aos={effect}
      data-aos-delay={delayMs}
      data-aos-offset={aosOffset}
    >
      {children}
    </div>
  );
}