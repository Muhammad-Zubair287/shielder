import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';
import { NavigationProgress } from '@/components/NavigationProgress';
import { ThemeClientWrapper } from '@/components/layout/ThemeClientWrapper';
import { DirSync } from '@/components/DirSync';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });

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
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
