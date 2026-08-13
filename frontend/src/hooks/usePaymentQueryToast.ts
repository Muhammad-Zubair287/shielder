'use client';

/**
 * Shows a payment-related toast from URL query params exactly once.
 * Guards against React StrictMode double-mount and history re-navigation.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

type PaymentQueryToastOptions = {
  paymentParam: string;
  messageKeyParam?: string | null;
  fallbackMessageKey: string;
  resolveMessage: (key: string) => string;
  toastFn?: (message: string) => void;
  stripPath?: string;
};

/** Process-wide claim set — survives StrictMode remount within the same JS realm */
const claimedToasts = new Set<string>();

function storageKey(payment: string, messageKey: string | null | undefined): string {
  return `shielder:payment-toast:${payment}:${messageKey || 'default'}`;
}

function tryClaim(key: string): boolean {
  if (claimedToasts.has(key)) return false;
  if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
    claimedToasts.add(key);
    return false;
  }
  claimedToasts.add(key);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(key, '1');
  }
  return true;
}

export function usePaymentQueryToast({
  paymentParam,
  messageKeyParam,
  fallbackMessageKey,
  resolveMessage,
  toastFn = toast.error,
  stripPath = '/checkout',
}: PaymentQueryToastOptions): void {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const payment = params?.get('payment');
    if (payment !== paymentParam) return;

    const messageKey = messageKeyParam ?? params?.get('messageKey');
    const key = storageKey(payment, messageKey);

    if (!tryClaim(key)) {
      router.replace(stripPath, { scroll: false });
      return;
    }

    const resolvedKey =
      messageKey && resolveMessage(messageKey) !== messageKey
        ? messageKey
        : fallbackMessageKey;
    toastFn(resolveMessage(resolvedKey));
    router.replace(stripPath, { scroll: false });
  }, [params, paymentParam, messageKeyParam, fallbackMessageKey, resolveMessage, toastFn, stripPath, router]);
}
