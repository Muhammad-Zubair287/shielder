/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts}',
    './public/locales/**/*.json',
  ],
  // RTL/LTR: Tailwind v3.3+ ships `rtl:` and `ltr:` variants out-of-the-box.
  // They activate based on the nearest ancestor [dir="rtl"] / [dir="ltr"].
  // LanguageContext sets document.documentElement.dir on every locale change.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shielder: {
          primary: '#045870',
          secondary: '#0205A6',
          accent: '#0205A6', // Added accent color
          dark: '#0A1E36',
          critical: '#FF4C4C',
          warning: '#FFC107',
          gray: {
            50: '#F9FAFB',
            400: '#9CA3AF',
            600: '#4B5563',
          }
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        // Cairo is loaded in root layout with variable '--font-cairo'
        arabic: ['var(--font-cairo)', 'Cairo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
