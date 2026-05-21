import { Suspense } from 'react';
import { ForgotPasswordResetContent } from './reset-content';

export default function ForgotPasswordResetPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPasswordResetContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-sm pt-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <div className="h-6 w-40 bg-slate-100 rounded mb-3" />
          <div className="h-4 w-56 bg-slate-100 rounded mb-8" />
          <div className="space-y-4">
            <div className="h-11 bg-slate-100 rounded-full" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-11 bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}