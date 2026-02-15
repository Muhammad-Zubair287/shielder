'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export const ProtectedRoute = ({ children, requiredRole = ['ADMIN', 'SUPER_ADMIN'] }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (user && !roles.includes(user.role)) {
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, requiredRole]);

  const isAuthorized = () => {
    if (isLoading) return false;
    if (!isAuthenticated) return false;
    if (!requiredRole) return true;
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return user && roles.includes(user.role);
  };

  if (isLoading || !isAuthenticated || !isAuthorized()) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-shielder-dark">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-shielder-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white font-medium">Authenticating Shielder Access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
