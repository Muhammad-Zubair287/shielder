'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';
import { clsx } from 'clsx';

const AdminLayoutInner = ({ children }: { children: React.ReactNode }) => {
  const { sidebarCollapsed } = useDashboard();

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <Sidebar />
      <div 
        className={clsx(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        <Navbar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}>
      <DashboardProvider>
        <AdminLayoutInner>
          {children}
        </AdminLayoutInner>
      </DashboardProvider>
    </ProtectedRoute>
  );
}
