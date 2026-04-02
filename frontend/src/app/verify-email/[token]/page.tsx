'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    if (token) {
      router.replace(`/verify-email?token=${encodeURIComponent(token)}`);
    } else {
      router.replace('/verify-email');
    }
  }, [router, token]);

  return null;
}