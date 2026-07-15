'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isTwoFactorRoute = pathname === '/admin/admin-2fa' || pathname === '/superadmin/superadmin-2fa';

  useEffect(() => {
    if (isTwoFactorRoute) return;
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        // Redirect to the correct panel based on actual role
        if (user.role === 'SUPER_ADMIN') {
          router.replace('/superadmin/dashboard');
        } else if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/');
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, requiredRole, isTwoFactorRoute]);

  const isAuthorized = () => {
    if (isTwoFactorRoute) return true;
    if (isLoading) return false;
    if (!isAuthenticated) return false;
    if (!requiredRole) return true;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return !!user && roles.includes(user.role);
  };

  if (!isTwoFactorRoute && (isLoading || !isAuthenticated || !isAuthorized())) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0C1B33]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm font-semibold tracking-wider">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

