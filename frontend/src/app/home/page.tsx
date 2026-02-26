'use client';

/**
 * Landing Page — /home
 * ─────────────────────────────────────────────────────────────────────────
 * Public-facing homepage for the Shielder / FilterPro platform.
 * Assembles all section components in order.
 */

import React from 'react';
import LandingNavbar           from './_components/LandingNavbar';
import HeroSection             from './_components/HeroSection';
import StatsSection            from './_components/StatsSection';
import WhyChooseUsSection      from './_components/WhyChooseUsSection';
import ProductCategoriesSection from './_components/ProductCategoriesSection';
import TrustSection            from './_components/TrustSection';
import CTASection              from './_components/CTASection';
import ContactSection          from './_components/ContactSection';
import LandingFooter           from './_components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <WhyChooseUsSection />
        <ProductCategoriesSection />
        <TrustSection />
        <CTASection />
        <ContactSection />
      </main>

      <LandingFooter />
    </div>
  );
}
