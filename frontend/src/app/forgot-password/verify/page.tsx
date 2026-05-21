import { Suspense } from 'react';
import { ForgotPasswordVerifyContent } from './verify-content';

export default function ForgotPasswordVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPasswordVerifyContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-sm pt-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <div className="h-6 w-44 bg-slate-100 rounded mb-3" />
          <div className="h-4 w-64 bg-slate-100 rounded mb-8" />
          <div className="flex justify-between gap-2 sm:gap-2.5 mb-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="h-11 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}