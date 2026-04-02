'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ResetPasswordTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    if (token) {
      router.replace(`/reset-password?token=${encodeURIComponent(token)}`);
    } else {
      router.replace('/reset-password');
    }
  }, [router, token]);

  return null;
}