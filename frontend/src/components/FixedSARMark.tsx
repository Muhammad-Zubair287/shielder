'use client';

import React from 'react';

interface FixedSARMarkProps {
  className?: string;
  size?: number;
}

export default function FixedSARMark({ className = '', size }: FixedSARMarkProps) {
  const style = size
    ? { width: size, height: size }
    : { width: '1em', height: '1em' };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/riyal-logo.png"
      alt="SAR"
      aria-label="Saudi Riyal"
      className={`inline-block align-middle ${className}`}
      style={style}
    />
  );
}
