import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AOSProvider } from '@/components/providers/AOSProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';
import { QuotationProvider } from '@/contexts/QuotationContext';
import { NavigationProgress } from '@/components/NavigationProgress';
import { ThemeClientWrapper } from '@/components/layout/ThemeClientWrapper';
import SmartBackButton from '@/components/layout/SmartBackButton';
import { DirSync } from '@/components/DirSync';
import SessionTimeoutWatcher from '@/components/providers/SessionTimeoutWatcher';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });

const themeInitScript = `
  (function () {
    try {
      var theme = localStorage.getItem('theme');
      var root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch (error) {}
  })();
`;

export const metadata: Metadata = {
  title: 'Shielder - Industrial Filters Digital Platform',
  description: 'Enterprise digital backbone for industrial filters',
};

// DNS / TCP warm-up for Google Fonts and the Railway backend.
// The backend URL is injected at build time; falls back to localhost.
const API_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Warm up Google Fonts CDN connection before any CSS/JS requests */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Warm up Railway backend so the first API call doesn't pay TCP cost */}
        {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />}
        {API_ORIGIN && <link rel="dns-prefetch" href={API_ORIGIN} />}
      </head>
      <body className={`${inter.className} ${cairo.variable}`} suppressHydrationWarning>
        {/* Inline dir-sync script — sets [dir] + [lang] before React hydrates */}
        <DirSync />
        <NavigationProgress />
        <ThemeClientWrapper />
        <SmartBackButton />
        <LanguageProvider>
          <AOSProvider>
            <QueryProvider>
              <AuthProvider>
                <SessionTimeoutWatcher />
                <CurrencyProvider>
                <CartProvider>
                  <QuotationProvider>
                  {children}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 1000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                      success: {
                        duration: 1000,
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        duration: 1000,
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                  </QuotationProvider>
                </CartProvider>
                </CurrencyProvider>
              </AuthProvider>
            </QueryProvider>
          </AOSProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
