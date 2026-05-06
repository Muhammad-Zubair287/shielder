'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Loader2, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import privacyPolicyService from '@/services/privacyPolicy.service';
import LandingNavbar from '../home/_components/LandingNavbar';
import LandingFooter from '../home/_components/LandingFooter';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';

export default function PrivacyPolicyPage() {
  const { t, locale, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicy();
  }, [locale]);

  const fetchPolicy = async () => {
    try {
      const { data } = await privacyPolicyService.getPublicPolicy();
      if (data.success) {
        const policyData = data.data;
        const rawContent = locale === 'ar' ? policyData.contentAr : policyData.contentEn;
        // Sanitize content before rendering
        setContent(DOMPurify.sanitize(rawContent));
        setUpdatedAt(policyData.updatedAt || null);
      }
    } catch (error) {
      console.error('Failed to fetch privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="bg-[#0A1E36] text-white py-16 md:py-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#F97216]/10 skew-x-12 translate-x-1/2" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className={`max-w-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 bg-[#F97216]/20 text-[#F97216] rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-[#F97216]/30`}>
                <Shield size={14} />
                {t('privacyPolicy')}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                {t('privacyPolicy')}
              </h1>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                {t('privacyPolicySubtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 md:-mt-16 pb-12 relative z-20">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#F97216]" />
                <p className="text-gray-400 font-medium">{t('loading')}</p>
              </div>
            ) : (
              <div className="p-8 md:p-12 lg:p-16">
                {updatedAt && (
                  <div className={`flex items-center gap-2 text-sm text-gray-400 mb-10 pb-6 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Calendar size={16} />
                    <span>
                      {isRTL ? 'آخر تحديث: ' : 'Last Updated: '} 
                      {format(new Date(updatedAt), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                )}
                
                <div 
                  className={`prose prose-lg max-w-none text-gray-600 leading-relaxed prose-headings:text-[#0A1E36] prose-headings:font-bold prose-p:mb-6 prose-strong:text-[#0A1E36] prose-a:text-[#F97216] prose-ul:list-disc prose-ol:list-decimal ${isRTL ? 'text-right' : 'text-left'}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  dangerouslySetInnerHTML={{ __html: content }}
                />

                {/* Contact Footer in Content */}
                <div className="mt-16 pt-16 border-t border-gray-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0A1E36] mb-2">
                    {isRTL ? 'هل لديك أسئلة حول خصوصيتك؟' : 'Have questions about your privacy?'}
                  </h3>
                  <p className="text-gray-500 mb-8 max-w-md">
                    {isRTL 
                      ? 'إذا كان لديك أي أسئلة أو مخاوف بشأن سياسة الخصوصية الخاصة بنا، فلا تتردد في الاتصال بفريق الدعم لدينا.'
                      : 'If you have any questions or concerns regarding our privacy policy, please feel free to contact our support team.'}
                  </p>
                  <a 
                    href="/contact"
                    className="px-8 py-3 bg-[#0A1E36] text-white rounded-xl font-bold hover:bg-[#0205A6] transition-all shadow-md shadow-blue-900/10"
                  >
                    {isRTL ? 'اتصل بنا' : 'Contact Us'}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
