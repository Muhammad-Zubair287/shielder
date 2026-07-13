'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type BackRule = {
  prefix: string;
  fallback: string;
};

const BACK_RULES: BackRule[] = [
  { prefix: '/products/', fallback: '/products' },

  { prefix: '/order-confirmation/', fallback: '/my-orders' },
  { prefix: '/reset-password/', fallback: '/login' },
  { prefix: '/verify-email/', fallback: '/login' },
  { prefix: '/admin/orders/', fallback: '/admin/orders' },
  { prefix: '/admin/users/', fallback: '/admin/users' },
  { prefix: '/admin/quotations/', fallback: '/admin/quotations' },
  { prefix: '/superadmin/orders/', fallback: '/superadmin/orders' },
  { prefix: '/superadmin/payments/', fallback: '/superadmin/payments' },
  { prefix: '/superadmin/quotations/', fallback: '/superadmin/quotations' },
];

function resolveFallback(pathname: string): string | null {
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  for (const rule of BACK_RULES) {
    if (normalizedPath.startsWith(rule.prefix) && normalizedPath !== rule.fallback) {
      return rule.fallback;
    }
  }

  return null;
}

export default function SmartBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = pathname || '/';

  // Admin and superadmin layouts already provide their own in-page navigation.
  if (normalizedPath.startsWith('/admin') || normalizedPath.startsWith('/superadmin')) {
    return null;
  }

  const fallback = useMemo(() => resolveFallback(normalizedPath), [normalizedPath]);

  if (!fallback) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
      className="fixed left-4 top-24 z-[90] inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm font-semibold text-gray-700 shadow-md backdrop-blur transition hover:bg-white hover:text-black"
    >
      <ArrowLeft size={18} />
      <span>Back</span>
    </button>
  );
}
