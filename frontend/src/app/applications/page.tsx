'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { applicationService, Application, ApplicationPlatform } from '@/services/application.service';
import { getImageUrl } from '@/utils/helpers';
import Image from 'next/image';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 h-40 rounded-xl bg-gray-100" />
      <div className="mb-2 h-4 w-2/3 rounded bg-gray-100" />
      <div className="mb-3 h-3 w-1/3 rounded bg-gray-100" />
      <div className="h-3 w-full rounded bg-gray-100" />
      <div className="mt-1 h-3 w-5/6 rounded bg-gray-100" />
      <div className="mt-5 h-10 rounded-xl bg-gray-100" />
    </div>
  );
}

function PlatformBadge({ platform, t }: { platform: ApplicationPlatform; t: (key: string) => string }) {
  if (platform === 'ANDROID') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        <Smartphone size={11} />
        {t('applicationsAndroid') || 'Android'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      <Smartphone size={11} />
      {t('applicationsIOS') || 'iOS'}
    </span>
  );
}

export default function ApplicationsPage() {
  const { isRTL, t } = useLanguage();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationService
      .listActive()
      .then((res) => setApps(res.data || []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col pt-[80px]" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      {/* Hero — matches Home/About/Resources pattern */}
      <section className="relative bg-[#0A1E36] py-20 text-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${getImageUrl('uploads/applications/Application background.png')}')` }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E36]/95 via-[#0A1E36]/80 to-[#0A1E36]/60" />
        <div className="relative mx-auto max-w-3xl px-4">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#123C9C]/40 bg-[#123C9C]/20 px-4 py-1.5 text-sm font-semibold text-white">
            <Smartphone size={15} />
            {t('applicationsManage') || 'Mobile Apps'}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t('applicationsTitle') || 'Our Applications'}
          </h1>
          <p className="mt-4 text-lg text-gray-200">
            {t('applicationsSubtitle') || 'Download our mobile applications to manage your orders and filtration solutions on the go.'}
          </p>
        </div>
      </section>

      {/* App cards grid */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Smartphone size={36} className="text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-500">
              {t('applicationsNoApps') || 'No applications available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => {
              const imgUrl = getImageUrl(app.image);
              return (
                <article
                  key={app.id}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative mb-4 h-44 w-full overflow-hidden rounded-xl bg-gray-50">
                    {imgUrl ? (
                      <Image src={imgUrl} alt={app.applicationName} fill className="object-contain p-2" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Smartphone size={48} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Name & platform */}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-gray-900 leading-tight">{app.applicationName}</h2>
                    <PlatformBadge platform={app.platform} t={t} />
                  </div>

                  {/* Description */}
                  {app.description && (
                    <p className="mt-2 flex-1 text-sm text-gray-500 line-clamp-3">{app.description}</p>
                  )}

                  {/* Download button */}
                  <a
                    href={app.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#123C9C] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#0D2F8C] transition-colors"
                  >
                    <Download size={15} />
                    {t('applicationsDownloadNow') || 'Download Now'}
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <LandingFooter />
    </div>
  );
}
