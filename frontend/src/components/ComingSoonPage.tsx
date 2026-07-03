'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePathname } from 'next/navigation';
import { Construction, ArrowRight } from 'lucide-react';

interface ComingSoonPageProps {
  title?: string;
}

export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  const { t, isRTL } = useLanguage();
  const pathname = usePathname();

  // Extract page name from pathname for dynamic title
  const getPageTitle = () => {
    if (title) return title;
    
    // Extract the last part of the path and format it
    const pathParts = pathname.split('/').filter(Boolean);
    const pageName = pathParts[pathParts.length - 1];
    
    // Convert kebab-case or camelCase to Title Case
    return pageName
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  };

  const pageTitle = getPageTitle();

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl w-full">
          <div className="bg-white rounded-2xl shadow-xl">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10">
              {/* Left Side - Illustration */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-md aspect-square">
                  {/* Modern geometric illustration */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Main circle with gradient */}
                      <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg">
                        {/* Inner circle */}
                        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white flex items-center justify-center shadow-inner">
                          {/* Icon container */}
                          <div className="relative">
                            <Construction 
                              size={80} 
                              className="text-[#0e2441] sm:hidden" 
                              strokeWidth={1.5}
                            />
                            <Construction 
                              size={96} 
                              className="text-[#0e2441] hidden sm:block" 
                              strokeWidth={1.5}
                            />
                            {/* Decorative elements */}
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
                            <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75" />
                            <div className="absolute top-0 -left-4 w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      </div>
                      {/* Orbiting dots */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
                      </div>
                      <div className="absolute bottom-0 right-0 translate-x-4 translate-y-4">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Content */}
              <div className={`flex flex-col justify-center ${isRTL ? 'text-right' : 'text-left'}`}>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-6 w-fit">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-blue-900">
                    {t('comingSoon.badge') || 'Coming Soon'}
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  {pageTitle}
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-gray-600 mb-6 leading-relaxed">
                  {t('comingSoon.subtitle') || "We're currently building this section to provide you with a better experience. Please check back soon for new content and features."}
                </p>

                {/* Optional message */}
                <p className="text-base text-gray-500 mb-8 leading-relaxed">
                  {t('comingSoon.description') || 'Our team is actively working on this page. Thank you for your patience while we prepare valuable resources and information for you.'}
                </p>

                {/* Action Buttons */}
                <div className={`flex flex-col sm:flex-row gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <Link
                    href="/home"
                    className="inline-flex items-center justify-center gap-2 bg-[#0e2441] hover:bg-[#1a3a6e] text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg group"
                  >
                    {t('comingSoon.returnHome') || 'Return to Home'}
                    <ArrowRight 
                      size={18} 
                      className={`transition-transform duration-200 group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} 
                    />
                  </Link>

                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#0e2441] border-2 border-[#0e2441] font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md group"
                  >
                    {t('comingSoon.browseProducts') || 'Browse Products'}
                    <ArrowRight 
                      size={18} 
                      className={`transition-transform duration-200 group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} 
                    />
                  </Link>
                </div>

                {/* Additional info */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {t('comingSoon.status') || 'Under Development'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom message */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {t('comingSoon.contactInfo') || 'Need assistance? Contact us at'}{' '}
              <a 
                href="tel:+966506814416" 
                className="font-semibold text-[#0e2441] hover:text-[#191970] transition-colors"
                dir="ltr"
              >
                +966 50 681 4416
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
