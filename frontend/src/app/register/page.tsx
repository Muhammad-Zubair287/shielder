"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES } from '@/utils/constants';
import type { RegisterRequest } from '@/types';
import { MultiStepRegistrationForm } from '@/components/auth/MultiStepRegistrationForm';

export default function RegisterPage() {
  const { register, isSubmitting } = useAuth();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const redirectHandled = useRef(false);

  useEffect(() => {
    if (isLoading || redirectHandled.current) return;
    if (!isAuthenticated || !user) return;

    if (user.role === 'SUPER_ADMIN') {
      router.replace(ROUTES.SUPER_ADMIN_DASHBOARD);
      return;
    }

    if (user.role === 'ADMIN') {
      router.replace(ROUTES.ADMIN_DASHBOARD);
      return;
    }

    router.replace(ROUTES.CUSTOMER_DASHBOARD);
  }, [isAuthenticated, isLoading, router, user]);

  const handleSubmit = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    address: string;
    companyName: string;
    password: string;
    confirmPassword: string;
  }) => {
    redirectHandled.current = true;

    const payload: RegisterRequest = {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      address: data.address,
      companyName: data.companyName,
      password: data.password,
    };

    await register(payload);
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10 ${isRTL ? 'font-arabic' : ''}`}>
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-600 mt-2">
            Register securely in three guided steps with password-strength checks and protected account setup.
          </p>
        </div>

        <MultiStepRegistrationForm onSubmit={handleSubmit} isLoading={isSubmitting} />

        <div className="text-center mt-8 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href={ROUTES.LOGIN} className="text-[#FF6B35] font-semibold hover:text-[#FF5722]">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
