'use client';

import React from 'react';
import LandingNavbar from './_components/LandingNavbar';
import HeroSection from './_components/HeroSection';
import FeaturesBarSection from './_components/FeaturesBarSection';
import ProductCategoriesSection from './_components/ProductCategoriesSection';
import ApplicationsSection from './_components/ApplicationsSection';
import WhyChooseUsSection from './_components/WhyChooseUsSection';
import LandingFooter from './_components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection />
        <ProductCategoriesSection />
        <FeaturesBarSection />
        <ApplicationsSection />
        <WhyChooseUsSection />
      </main>

      <LandingFooter />
    </div>
  );
}