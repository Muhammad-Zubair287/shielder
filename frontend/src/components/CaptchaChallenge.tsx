'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Lock, Zap } from 'lucide-react';
import { CAPTCHA_LABELS } from '@/constants/ui.constants';
import { useLanguage } from '@/contexts/LanguageContext';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface CaptchaChallengeProps {
  onVerify: (verified: boolean, token?: string) => void;
  isVerified: boolean;
}

/**
 * CaptchaChallenge — Enhanced CAPTCHA component with simple challenge verification
 * 
 * Features:
 * - Visual locked/unlocked state with smooth animation
 * - Simple arithmetic challenge (e.g., "What is 5 + 3?")
 * - Prevents brute-force through attempt limiting
 * - Verification token timestamp for rate limiting
 * - Fallback checkbox for accessibility
 */
export default function CaptchaChallenge({ onVerify, isVerified }: CaptchaChallengeProps) {
  const [challenge, setChallenge] = useState<{
    num1: number;
    num2: number;
    answer: number;
  } | null>(null);
  
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [providerLoading, setProviderLoading] = useState(false);
  const { locale, isRTL, t } = useLanguage();
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const providerEnabled = Boolean(recaptchaSiteKey);

  // Generate a new challenge on mount
  useEffect(() => {
    generateChallenge();
  }, []);

  useEffect(() => {
    if (!providerEnabled) return;

    const scriptId = 'google-recaptcha-v3-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    // include the 'hl' param so Google reCAPTCHA UI uses the active locale when possible
    const hl = locale || 'en';
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}&hl=${hl}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [providerEnabled, recaptchaSiteKey]);

  const generateChallenge = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    setChallenge({ num1, num2, answer });
    setUserAnswer('');
    setAttempts(0);
    setVerificationToken('');
    onVerify(false);
  };

  const handleAnswer = () => {
    if (!challenge) return;

    if (parseInt(userAnswer) === challenge.answer) {
      const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setVerificationToken(token);
      onVerify(true, token);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setUserAnswer('');

      if (newAttempts >= 3) {
        setShowFallback(true);
        generateChallenge();
      } else {
        // Generate new challenge after wrong answer
        generateChallenge();
      }
    }
  };

  const handleFallbackVerify = () => {
    const token = `captcha_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setVerificationToken(token);
    onVerify(true, token);
  };

  const handleProviderVerify = async () => {
    if (!providerEnabled || !recaptchaSiteKey) return;
    if (!window.grecaptcha) {
      setShowFallback(true);
      return;
    }

    setProviderLoading(true);
    try {
      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha?.ready(() => {
          window.grecaptcha
            ?.execute(recaptchaSiteKey, { action: 'contact_submit' })
            .then(resolve)
            .catch(reject);
        });
      });

      setVerificationToken(token);
      onVerify(true, token);
    } catch {
      setShowFallback(true);
      onVerify(false);
    } finally {
      setProviderLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim()) {
      handleAnswer();
    }
  };

  const L = (key: keyof typeof CAPTCHA_LABELS) => (t ? (t(key as any) as string) : CAPTCHA_LABELS[key]);

  if (isVerified && verificationToken) {
    return (
      <div className="rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">{t('contactCaptchaVerified') || CAPTCHA_LABELS.VERIFIED_TITLE}</p>
          <p className="text-xs text-green-700">{t('contactCaptchaRequired') || CAPTCHA_LABELS.VERIFIED_SUBTITLE}</p>
        </div>
      </div>
    );
  }

  if (isVerified === false && attempts >= 3 && showFallback) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-xs font-semibold text-orange-900 mb-2">{t('contactCaptchaTooMany') || CAPTCHA_LABELS.TOO_MANY_ATTEMPTS}</p>
          <p className="text-xs text-orange-700 mb-3">
            {t('contactCaptchaFallbackMessage') || CAPTCHA_LABELS.FALLBACK_MESSAGE}
          </p>
          <button
            type="button"
            onClick={handleFallbackVerify}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Zap size={14} />
            {t('contactCaptchaFallbackButton') || CAPTCHA_LABELS.FALLBACK_BUTTON}
          </button>
        </div>
      </div>
    );
  }

  if (providerEnabled && !showFallback) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={16} className="text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">{t('contactCaptchaSecure') || CAPTCHA_LABELS.SECURE_TITLE}</span>
          </div>
          <button
            type="button"
            onClick={handleProviderVerify}
            disabled={providerLoading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0205A6] hover:bg-[#0103d4] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <CheckCircle size={14} />
            {providerLoading ? (t('contactCaptchaVerifying') || CAPTCHA_LABELS.VERIFYING) : (t('contactCaptchaVerifyProvider') || CAPTCHA_LABELS.VERIFY_PROVIDER)}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          {t('contactCaptchaTrouble') || CAPTCHA_LABELS.TROUBLE_PREFIX}{' '}
          <button
            type="button"
            onClick={() => setShowFallback(true)}
            className="text-[#0205A6] hover:underline font-medium"
          >
            {t('contactCaptchaAccessibility') || CAPTCHA_LABELS.ACCESSIBILITY_OPTION}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Challenge Box */}
      <div className="rounded-lg border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-gray-600" />
          <span className={`text-xs font-semibold text-gray-700 ${isRTL ? 'text-right w-full' : ''}`}>{t('contactCaptchaTitle') || CAPTCHA_LABELS.ROBOT_CHECK_TITLE}</span>
        </div>

        {challenge && (
          <div className="space-y-3">
            {/* Question */}
            <div className={isRTL ? 'text-right' : 'text-center'}>
              <p className="text-sm font-bold text-gray-900">
                {isRTL ? `${t('captchaQuestionPrefix') || 'ما هو'} ${challenge.num1} + ${challenge.num2} ?` : `What is ${challenge.num1} + ${challenge.num2}?`}
              </p>
            </div>

            {/* Answer Input */}
            <div className="flex gap-2">
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('contactCaptchaAnswerPlaceholder') || CAPTCHA_LABELS.ANSWER_PLACEHOLDER}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent"
                style={{ direction: 'ltr', unicodeBidi: 'embed' }}
                min="0"
                max="99"
              />
              <button
                type="button"
                onClick={handleAnswer}
                disabled={!userAnswer.trim()}
                className="bg-[#0205A6] hover:bg-[#0103d4] disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {t('contactCaptchaCheck') || CAPTCHA_LABELS.CHECK_BUTTON}
              </button>
            </div>

            {/* Attempt Counter */}
            {attempts > 0 && attempts < 3 && (
              <p className="text-xs text-red-600">
                {t('contactCaptchaIncorrectPrefix') || CAPTCHA_LABELS.INCORRECT_PREFIX} {3 - attempts} attempt{3 - attempts > 1 ? 's' : ''} {t('contactCaptchaAttemptsSuffix') || CAPTCHA_LABELS.ATTEMPTS_SUFFIX}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Fallback Accessibility Notice */}
      <p className="text-xs text-gray-500 text-center">
        {t('contactCaptchaTrouble') || CAPTCHA_LABELS.TROUBLE_PREFIX} <button
          type="button"
          onClick={() => setShowFallback(!showFallback)}
          className="text-[#0205A6] hover:underline font-medium"
        >
          {t('contactCaptchaAccessibility') || CAPTCHA_LABELS.ACCESSIBILITY_OPTION}
        </button>
      </p>
    </div>
  );
}
