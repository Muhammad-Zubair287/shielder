'use client';

/**
 * Development-only mock EPG payment page.
 * Only functional when backend EPG_PROVIDER=mock (non-production).
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { epgService, type MockEpgScenario } from '@/services/epg.service';

type MockSession = {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  provider: 'mock';
  sessionStatus?: 'pending' | 'success' | 'failed' | 'cancelled';
  isExecutable?: boolean;
  terminalRedirectUrl?: string | null;
};

const SCENARIOS: MockEpgScenario[] = [
  'success',
  'failed',
  'cancelled',
  'pending',
  'timeout',
  'duplicate_callback',
  'refund_success',
  'refund_failure',
  'already_refunded',
];

function MockEpgPageInner() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const sessionId = params?.get('session') || '';
  const [session, setSession] = useState<MockSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', `/dev/mock-epg?session=${sessionId}`);
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router, sessionId]);

  useEffect(() => {
    if (!sessionId || authLoading || !isAuthenticated) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await epgService.getMockSession(sessionId);
        setSession(res?.data ?? null);
        setUnavailable(false);
      } catch {
        setUnavailable(true);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId, authLoading, isAuthenticated]);

  const runScenario = useCallback(async (scenario: MockEpgScenario) => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await epgService.triggerMockScenario(sessionId, scenario);
      const data = res?.data;

      // Prefer navigation over local toasts for terminal outcomes so checkout /
      // confirmation pages own the single user-facing message.
      if (data?.redirectUrl) {
        // location.replace removes mock-epg from history (prevents Back replay).
        window.location.replace(data.redirectUrl);
        return;
      }

      if (scenario === 'pending' || scenario === 'timeout') {
        toast(t('payment.pending'));
        return;
      }

      if (data?.refund?.success) {
        toast.success(t('payment.refunded'));
        return;
      }

      if (data?.refund && !data.refund.success) {
        toast.error(t('payment.refundFailed'));
        return;
      }

      toast.error(t('payment.failed'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('payment.verificationFailed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, t]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#0205A6]" size={36} />
      </div>
    );
  }

  const sessionComplete = session != null && session.isExecutable === false;

  if (unavailable || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <LandingNavbar />
        <main className="flex-1 pt-28 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertCircle className="text-red-400" size={48} />
          <p className="text-lg font-semibold text-gray-800">{t('payment.mockNotAvailable')}</p>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#0205A6] text-white flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <div className={isRTL ? 'text-right' : 'text-start'}>
                <h1 className="text-xl font-bold text-gray-900">{t('mockEpg.title')}</h1>
                <p className="text-xs text-amber-600 font-medium">{t('mockEpg.devOnly')}</p>
              </div>
            </div>

            <div className={`space-y-3 mb-8 ${isRTL ? 'text-right' : 'text-start'}`}>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">{t('mockEpg.orderLabel')}:</span>{' '}
                {session.orderNumber}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <span className="font-medium text-gray-800">{t('mockEpg.amountLabel')}:</span>
                <SARSymbol className="inline w-4 h-4" />
                {session.amount.toFixed(2)} {session.currency}
              </p>
            </div>

            <p className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-start'}`}>
              {t('mockEpg.scenarioLabel')}
            </p>

            {sessionComplete && (
              <div className={`mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 ${isRTL ? 'text-right' : 'text-start'}`}>
                <p className="text-sm font-semibold text-amber-900">{t('mockEpg.sessionCompleted')}</p>
                <p className="text-xs text-amber-700 mt-1">{t('mockEpg.sessionCompletedHint')}</p>
                {session.terminalRedirectUrl && (
                  <button
                    type="button"
                    onClick={() => router.replace(session.terminalRedirectUrl!)}
                    className="mt-3 text-sm font-semibold text-[#0205A6] hover:underline"
                  >
                    {t('mockEpg.viewResult')}
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-2">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario}
                  type="button"
                  disabled={submitting || sessionComplete}
                  onClick={() => runScenario(scenario)}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800
                    hover:border-[#0205A6] hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  {t(`mockEpg.scenario.${scenario}`)}
                </button>
              ))}
            </div>

            {submitting && (
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                {t('mockEpg.processing')}
              </div>
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export default function MockEpgPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="animate-spin text-[#0205A6]" size={36} />
        </div>
      }
    >
      <MockEpgPageInner />
    </Suspense>
  );
}
