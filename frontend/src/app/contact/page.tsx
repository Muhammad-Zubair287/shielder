'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Social icons (simple SVG) ─────────────────────────────────────────────────
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.927 19.927 0 0 0 5.993 3.03.077.077 0 0 0 .083-.026c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.13 13.13 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// ── Business hours data ───────────────────────────────────────────────────────
const BUSINESS_HOURS = [
  { day: 'Monday',    from: '8:00AM', to: '6:00PM', closed: false },
  { day: 'Tuesday',   from: '8:00AM', to: '6:00PM', closed: false },
  { day: 'Wednesday', from: '8:00AM', to: '6:00PM', closed: false },
  { day: 'Thursday',  from: '8:00AM', to: '6:00PM', closed: false },
  { day: 'Friday',    from: '8:00AM', to: '6:00PM', closed: false },
  { day: 'Saturday',  from: '9:00AM', to: '4:00PM', closed: false },
  { day: 'Sunday',    from: '',       to: '',        closed: true  },
];

const SUBJECTS = [
  'General Inquiry',
  'Product Support',
  'Quotation Request',
  'Other',
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContactPage() {
  const { t, isRTL } = useLanguage();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', subject: 'General Inquiry', message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const field = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate send — replace with real API call
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setForm({ firstName: '', lastName: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
    setTimeout(() => setSent(false), 4000);
  };

  const inputCls = `w-full border-0 border-b border-gray-300 pb-2 text-sm text-gray-900 placeholder-gray-400
    focus:outline-none focus:border-[#0205A6] bg-transparent transition-colors`;

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-20">

        {/* ── Hero contact card ──────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden border border-gray-200 shadow-sm">

            {/* Left — dark navy info panel */}
            <div className="relative bg-[#0D1637] text-white md:w-80 lg:w-96 flex-shrink-0 p-8 flex flex-col overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#F97316]/70 rounded-full translate-x-12 translate-y-12 pointer-events-none" />
              <div className="absolute bottom-16 right-10 w-24 h-24 bg-[#F97316]/40 rounded-full pointer-events-none" />

              <h2 className="text-xl font-bold leading-snug mb-8 relative z-10">
                {t('contactHeading')}
              </h2>

              <div className="space-y-5 flex-1 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-200">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-200">info@devflx.com</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-200 leading-relaxed">
                    123 Filter Street<br />Auto City, 12345 United States
                  </span>
                </div>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3 mt-10 relative z-10">
                {[
                  { Icon: TwitterIcon,   label: 'Twitter'  },
                  { Icon: InstagramIcon, label: 'Instagram' },
                  { Icon: DiscordIcon,   label: 'Discord'  },
                ].map(({ Icon, label }) => (
                  <button key={label} aria-label={label}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Icon />
                  </button>
                ))}
              </div>
            </div>

            {/* Right — contact form */}
            <div className="flex-1 bg-white p-8 lg:p-10">
              <h3 className="text-xl font-bold text-gray-900 text-center mb-8">{t('contactFormTitle')}</h3>

              {sent && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3 text-center">
                  {t('contactSentSuccess')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: First / Last Name */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('contactFirstName')}</label>
                    <input type="text" required placeholder={t('contactFirstNamePH')}
                      value={form.firstName} onChange={e => field('firstName', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('contactLastName')}</label>
                    <input type="text" required placeholder={t('contactLastNamePH')}
                      value={form.lastName} onChange={e => field('lastName', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                {/* Row 2: Email / Phone */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('contactEmail')}</label>
                    <input type="email" required placeholder={t('contactEmailPH')}
                      value={form.email} onChange={e => field('email', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('contactPhone')}</label>
                    <input type="tel" placeholder={t('contactPhonePH')}
                      value={form.phone} onChange={e => field('phone', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                {/* Subject radios */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-3">{t('contactSubject')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
                    {SUBJECTS.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer group">
                        {/* radio circle */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${form.subject === s ? 'border-[#0205A6]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                          {form.subject === s && <div className="w-2 h-2 rounded-full bg-[#0205A6]" />}
                        </div>
                        <input type="radio" className="sr-only" name="subject" value={s}
                          checked={form.subject === s} onChange={() => field('subject', s)} />
                        <span className={`text-xs font-medium ${form.subject === s ? 'text-[#0205A6]' : 'text-gray-600'}`}>
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t('contactMessage')}</label>
                  <textarea required rows={4} placeholder={t('contactMessagePH')}
                    value={form.message} onChange={e => field('message', e.target.value)}
                    className={`${inputCls} resize-none`} />
                </div>

                {/* Submit */}
                <div className="flex justify-center pt-2">
                  <button type="submit" disabled={sending}
                    className="bg-[#0205A6] hover:bg-[#0103d4] disabled:opacity-60 text-white font-semibold text-sm px-10 py-3 rounded-full transition-colors">
                    {sending ? t('contactSending') : t('contactSend')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── Business Hours ─────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contactBusinessHours')}</h2>

          <div className="space-y-3">
            {BUSINESS_HOURS.map(({ day, from, to, closed }) => (
              <div key={day}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4">
                <span className={`text-sm font-semibold w-32 ${closed ? 'text-[#F97316]' : 'text-gray-900'}`}>
                  {day}
                </span>
                {closed ? (
                  <span className="text-sm font-bold text-[#F97316]">{t('contactClosed')}</span>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{t('contactFrom')}</span>
                    <span className="font-bold text-gray-900">{from}</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <span>——</span>
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-gray-400">
                        <path d="M1 5h13M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{t('contactTo')}</span>
                    <span className="font-bold text-gray-900">{to}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
