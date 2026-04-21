import React from 'react';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-16 rounded-3xl bg-gray-100" />
      <div className="h-12 rounded-2xl bg-gray-100" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-gray-100" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-80 rounded-3xl bg-gray-100" />
        <div className="h-80 rounded-3xl bg-gray-100" />
      </div>
    </div>
  );
}
