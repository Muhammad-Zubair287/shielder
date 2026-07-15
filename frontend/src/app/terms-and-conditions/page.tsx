'use client';

import React from 'react';
import { Shield, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LandingNavbar from '../home/_components/LandingNavbar';
import LandingFooter from '../home/_components/LandingFooter';
import { format } from 'date-fns';

export default function TermsAndConditionsPage() {
  const { t, locale, isRTL } = useLanguage();
  
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'MMMM dd, yyyy');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-16">
        {/* Hero Section */}
        <section className="bg-[#0A1E36] text-white py-16 md:py-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#F97216]/10 skew-x-12 translate-x-1/2" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className={`max-w-3xl ${isRTL ? 'ms-auto text-right' : 'me-auto text-start'}`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 bg-[#F97216]/20 text-[#F97216] rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-[#F97216]/30`}>
                <Shield size={14} />
                {t('termsAndConditions')}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                {t('termsHeroTitle')}
              </h1>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                {t('termsHeroSubtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 md:-mt-16 pb-12 relative z-20">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12 lg:p-16">
              {/* Last Updated */}
              <div className={`flex items-center gap-2 text-sm text-gray-400 mb-10 pb-6 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar size={16} />
                <span>
                  {t('termsLastUpdated')} {formattedDate}
                </span>
              </div>
              
              {/* Section 1: Acceptance of Terms */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection1Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection1Content')}
                </p>
              </div>

              {/* Section 2: User Accounts */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection2Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection2Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                  <li>{t('termsSection2Bullet1')}</li>
                  <li>{t('termsSection2Bullet2')}</li>
                  <li>{t('termsSection2Bullet3')}</li>
                  <li>{t('termsSection2Bullet4')}</li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  {t('termsSection2Note')}
                </p>
              </div>

              {/* Section 3: Products & Services */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection3Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection3Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                  <li>{t('termsSection3Bullet1')}</li>
                  <li>{t('termsSection3Bullet2')}</li>
                  <li>{t('termsSection3Bullet3')}</li>
                  <li>{t('termsSection3Bullet4')}</li>
                  <li>{t('termsSection3Bullet5')}</li>
                  <li>{t('termsSection3Bullet6')}</li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  {t('termsSection3Note')}
                </p>
              </div>

              {/* Section 4: Quotations */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection4Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection4Content')}
                </p>
              </div>

              {/* Section 5: Orders */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection5Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection5Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                  <li>{t('termsSection5Bullet1')}</li>
                  <li>{t('termsSection5Bullet2')}</li>
                  <li>{t('termsSection5Bullet3')}</li>
                  <li>{t('termsSection5Bullet4')}</li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  {t('termsSection5Note')}
                </p>
              </div>

              {/* Section 6: Pricing */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection6Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection6Content')}
                </p>
              </div>

              {/* Section 7: Payments */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection7Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection7Content')}
                </p>
              </div>

              {/* Section 8: Shipping & Delivery */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection8Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection8Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                  <li>{t('termsSection8Bullet1')}</li>
                  <li>{t('termsSection8Bullet2')}</li>
                  <li>{t('termsSection8Bullet3')}</li>
                  <li>{t('termsSection8Bullet4')}</li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  {t('termsSection8Note')}
                </p>
              </div>

              {/* Section 9: Intellectual Property */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection9Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection9Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                  <li>{t('termsSection9Bullet1')}</li>
                  <li>{t('termsSection9Bullet2')}</li>
                  <li>{t('termsSection9Bullet3')}</li>
                  <li>{t('termsSection9Bullet4')}</li>
                  <li>{t('termsSection9Bullet5')}</li>
                  <li>{t('termsSection9Bullet6')}</li>
                  <li>{t('termsSection9Bullet7')}</li>
                  <li>{t('termsSection9Bullet8')}</li>
                </ul>
                <p className="text-gray-600 leading-relaxed">
                  {t('termsSection9Note')}
                </p>
              </div>

              {/* Section 10: Prohibited Use */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection10Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                  {t('termsSection10Intro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  <li>{t('termsSection10Bullet1')}</li>
                  <li>{t('termsSection10Bullet2')}</li>
                  <li>{t('termsSection10Bullet3')}</li>
                  <li>{t('termsSection10Bullet4')}</li>
                  <li>{t('termsSection10Bullet5')}</li>
                  <li>{t('termsSection10Bullet6')}</li>
                  <li>{t('termsSection10Bullet7')}</li>
                </ul>
              </div>

              {/* Section 11: Privacy */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection11Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection11Content')}
                </p>
              </div>

              {/* Section 12: Limitation of Liability */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection12Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection12Content')}
                </p>
              </div>

              {/* Section 13: Changes to These Terms */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection13Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection13Content')}
                </p>
              </div>

              {/* Section 14: Governing Law */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection14Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection14Content')}
                </p>
              </div>

              {/* Section 15: Contact Us */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[#0A1E36] mb-4">
                  {t('termsSection15Title')}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t('termsSection15Content')}
                </p>
              </div>

              {/* Contact Support CTA */}
              <div className={`mt-16 pt-16 border-t border-gray-100 flex flex-col items-center ${isRTL ? 'text-right' : 'text-center'}`}>
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#0A1E36] mb-2">
                  {t('termsContactTitle')}
                </h3>
                <p className="text-gray-500 mb-8 max-w-md">
                  {t('termsContactDescription')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="/contact"
                    className="px-8 py-3 bg-[#0A1E36] text-white rounded-xl font-bold hover:bg-[#0205A6] transition-all shadow-md shadow-blue-900/10"
                  >
                    {t('termsContactButton1')}
                  </a>
                  <a 
                    href="/products"
                    className="px-8 py-3 bg-white text-[#0A1E36] border-2 border-[#0A1E36] rounded-xl font-bold hover:bg-[#0A1E36] hover:text-white transition-all"
                  >
                    {t('termsContactButton2')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}