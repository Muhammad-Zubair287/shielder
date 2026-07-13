'use client';

import { Toaster } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function LocalizedToaster() {
  const { isRTL } = useLanguage();

  return (
    <Toaster
      position={isRTL ? 'top-left' : 'top-right'}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
        },
        success: {
          duration: 4000,
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
  );
}
