'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Facebook, Linkedin, Youtube } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { buildCompanyMailtoHref } from '@/services/settings.service';


export default function LandingFooter() {
  const { t, isRTL } = useLanguage();
  const { companyEmail } = usePublicSettings();
  const year = new Date().getFullYear();

  const productLinks = [
    { label: t('landingFooterProductAir') || 'Air Filters', href: '/products?category=air' },
    { label: t('landingFooterProductOil') || 'Oil Filters', href: '/products?category=oil' },
    { label: t('landingFooterProductFuel') || 'Fuel Filters', href: '/products?category=fuel' },
    { label: t('landingFooterProductHydraulic') || 'Hydraulic Filters', href: '/products?category=hydraulic' },
    { label: t('landingFooterProductCabin') || 'Cabin Filters', href: '/products?category=cabin' },
    { label: t('landingFooterProductCoolant') || 'Coolant Filters', href: '/products?category=coolant' },
  ];

  const companyLinks = [
    { label: t('landingFooterAboutUs') || 'About Us', href: '/about' },
    { label: t('landingFooterOurQuality') || 'Our Quality', href: '/our-quality' },
    { label: t('landingFooterCareers') || 'Careers', href: '/careers' },
    { label: t('landingFooterNews') || 'News', href: '/news' },
    { label: t('landingFooterContactUS') || 'Contact', href: '/contact' },
    { label: t('landingFooterPrivacy') || 'Privacy Policy', href: '/privacy-policy' },
    { label: t('landingFooterTerms') || 'Terms & Conditions', href: '/terms-and-conditions' },
  ];

  const resourceLinks = [
    { label: t('landingFooterCatalog') || 'Catalog', href: '/resources#customer-support' },
    { label: t('landingFooterCrossReference') || 'Cross Reference', href: '/resources#customer-support' },
    { label: t('landingFooterInstallationGuides') || 'Installation Guides', href: '/resources#installation-guides' },
    { label: t('landingFooterFAQs') || 'FAQs', href: '/resources#faq' },
    { label: t('landingFooterWarranty') || 'Warranty', href: '/resources#warranty-information' },
  ];

  const getResourceKey = (index: number) => `resource-${index}`;

  return (
    <footer className="bg-[#0A1E36] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

            {/* Brand Column */}
            <div className={`col-span-2 md:col-span-3 lg:col-span-1 space-y-4 ${isRTL ? 'text-right' : 'text-start'}`}>
              <Link href="/home" className="inline-block">
                <div className="relative h-16 w-40">
                  <Image
                    src="/images/landing/shielder image 23.png"
                    alt="Shielder"
                    fill
                    className="object-contain"
                    sizes="1000px"
                  />
                </div>
              </Link>
              <p className="text-white/70 text-sm leading-relaxed">
                {t('landingFooterAbout') || 'High performance filters for heavy-duty engines and equipment. Built to protect. Engineered to perform.'}
              </p>
            </div>

            {/* Products Column */}
            <div className={isRTL ? 'text-right' : 'text-start'}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                {t('landingFooterProducts') || 'PRODUCTS'}
              </h4>
              <ul className="space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/70 text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div className={isRTL ? 'text-right' : 'text-start'}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                {t('landingFooterCompany') || 'COMPANY'}
              </h4>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/70 text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Column */}
            <div className={isRTL ? 'text-right' : 'text-start'}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                {t('landingFooterResources') || 'RESOURCES'}
              </h4>
              <ul className="space-y-2.5">
                {resourceLinks.map((link, index) => (
                  <li key={getResourceKey(index)}>
                    <Link href={link.href} className="text-white/70 text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stay Updated Column */}
            <div className={`col-span-2 md:col-span-3 lg:col-span-1 ${isRTL ? 'text-right' : 'text-start'}`}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                {t('landingFooterStayUpdated') || 'STAY UPDATED'}
              </h4>
              <p className="text-white/70 text-sm mb-4">
                {t('landingFooterNewsletterText') || 'Subscribe to get the latest updates, new products and special offers.'}
              </p>
              {companyEmail && (
                <div className={`mb-4 space-y-1 ${isRTL ? 'text-right' : 'text-start'}`}>
                  <p className="text-white font-semibold text-sm">
                    {t('landingFooterContact')}
                  </p>
                  <a
                    href={buildCompanyMailtoHref(companyEmail) ?? undefined}
                    className="inline-flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors"
                    dir="ltr"
                  >
                    <Mail size={14} className="shrink-0" />
                    {companyEmail}
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t('landingFooterEmailPlaceholder') || 'Enter your email'}
                  className={`flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:border-white/40 ${isRTL ? 'text-right' : 'text-left'}`}
                />
                {companyEmail ? (
                  <a
                    href={buildCompanyMailtoHref(companyEmail) ?? undefined}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label={t('landingFooterContact')}
                  >
                    <Mail size={18} className="text-white" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 bg-white/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                    aria-label={t('landingFooterContact')}
                  >
                    <Mail size={18} className="text-white" />
                  </button>
                )}
              </div>
              {/* Social Links */}
              <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                  <Facebook size={18} className="text-white" />
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                  <Linkedin size={18} className="text-white" />
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                  <Youtube size={18} className="text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className={`flex flex-col md:flex-row items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <p className="text-white/60 text-xs">
                © {year} Shielder. {t('landingFooterRights') || 'All rights reserved.'}
              </p>
              <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Link href="/privacy-policy" className="text-white/60 text-xs hover:text-white transition-colors">
                  {t('landingFooterPrivacyPolicy') || 'Privacy Policy'}
                </Link>
                <Link href="/terms-and-conditions" className="text-white/60 text-xs hover:text-white transition-colors">
                  {t('landingFooterTerms') || 'Terms & Conditions'}
                </Link>
                <Link href="#" className="text-white/60 text-xs hover:text-white transition-colors">
                  {t('landingFooterSitemap') || 'Sitemap'}
                </Link>
              </div>
            </div>
          </div>
        </div>
    </footer>
  );
}
