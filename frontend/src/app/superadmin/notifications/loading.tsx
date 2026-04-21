import React from 'react';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-14 rounded-2xl bg-gray-100" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl bg-gray-100" />
        ))}
      </div>

      <div className="h-20 rounded-3xl bg-gray-100" />

      <div className="rounded-3xl border border-gray-100 bg-white p-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-14 rounded-lg bg-gray-100 mb-3 last:mb-0" />
        ))}
      </div>
    </div>
  );
}
