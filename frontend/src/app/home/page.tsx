'use client';

/**
 * Landing Page — /home
 * ─────────────────────────────────────────────────────────────────────────
 * Public-facing homepage for the Shielder / FilterPro platform.
 * Assembles all section components in order.
 */

import React, { Suspense, lazy } from 'react';
import LandingNavbar from './_components/LandingNavbar';
import HeroSection   from './_components/HeroSection';

// Below-the-fold — lazy-loaded after hydration to shrink initial bundle
const StatsSection             = lazy(() => import('./_components/StatsSection'));
const WhyChooseUsSection       = lazy(() => import('./_components/WhyChooseUsSection'));
const ProductCategoriesSection = lazy(() => import('./_components/ProductCategoriesSection'));
const TrustSection             = lazy(() => import('./_components/TrustSection'));
const CTASection               = lazy(() => import('./_components/CTASection'));
const ContactSection           = lazy(() => import('./_components/ContactSection'));
const LandingFooter            = lazy(() => import('./_components/LandingFooter'));

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        {/* Above the fold — rendered immediately */}
        <HeroSection />

        {/* Below the fold — streamed in after initial paint */}
        <Suspense fallback={null}>
          <StatsSection />
          <WhyChooseUsSection />
          <ProductCategoriesSection />
          <TrustSection />
          <CTASection />
          <ContactSection />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </div>
  );
}
