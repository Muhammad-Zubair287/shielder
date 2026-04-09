/**
 * Fixed Saudi Riyal symbol component.
 * Always renders the official SAR image asset.
 */
'use client';

export default function SARSymbol({
  className = '',
  size,
}: {
  className?: string;
  /** Pixel size — defaults to 1em so it scales with surrounding text */
  size?: number;
}) {
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

