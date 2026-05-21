'use client';

import React, { Suspense } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminNavbar } from '@/components/layout/AdminNavbar';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-12 h-12 text-[#FF6B35] animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );
}

const AdminLayoutInner = ({ children }: { children: React.ReactNode }) => {
  const { sidebarCollapsed } = useDashboard();
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const isTwoFactorRoute = pathname === '/admin/admin-2fa';

  if (isTwoFactorRoute) {
    return <>{children}</>;
  }

  return (
    <div
      className="flex h-screen bg-[#F5F6FA] overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Fixed Dark Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className={twMerge(
        'flex flex-col flex-1 transition-all duration-300 relative overflow-hidden',
        isRTL
          ? (sidebarCollapsed ? 'lg:pr-[68px]' : 'lg:pr-[240px]')
          : (sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[240px]')
      )}>
        <AdminNavbar />
        <main className="flex-1 overflow-y-auto p-5 md:p-7 scrollbar-hide">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <LanguageProvider>
        <DashboardProvider>
          <AdminLayoutInner>
            {children}
          </AdminLayoutInner>
        </DashboardProvider>
      </LanguageProvider>
    </ProtectedRoute>
  );
}


