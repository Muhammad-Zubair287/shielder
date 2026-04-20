'use client';

import React, { Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-12 h-12 text-shielder-primary animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );
}

function SuperAdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useDashboard();
  const { isRTL } = useLanguage();
  
  return (
    <div
      className="superadmin-shell flex h-screen overflow-hidden text-slate-900 dark:text-slate-100"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={cn(
        'flex flex-col flex-1 transition-all duration-300 relative overflow-hidden',
        isRTL
          ? (sidebarCollapsed ? 'lg:pr-[72px]' : 'lg:pr-[260px]')
          : (sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]')
      )}>
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide bg-transparent">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <LanguageProvider>
        <DashboardProvider>
          <SuperAdminLayoutContent>
            {children}
          </SuperAdminLayoutContent>
        </DashboardProvider>
      </LanguageProvider>
    </ProtectedRoute>
  );
}
