'use client';

import React, { useState } from 'react';
import { Calendar, RefreshCcw, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReportDateRange } from './types';

interface Props {
  dateRange: ReportDateRange;
  loading: boolean;
  onApply: (range: ReportDateRange) => void;
  onRefresh: () => void;
}

type Preset = '7D' | '30D' | '90D' | 'CUSTOM';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DateFilter({ dateRange, loading, onApply, onRefresh }: Props) {
  const { t, isRTL } = useLanguage();
  const [preset, setPreset] = useState<Preset>('30D');
  const [custom, setCustom] = useState({ from: daysAgo(30), to: today() });

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === '7D')  onApply({ from: daysAgo(7), to: today() });
    if (p === '30D') onApply({ from: daysAgo(30), to: today() });
    if (p === '90D') onApply({ from: daysAgo(90), to: today() });
  }

  function clearFilters() {
    const range = { from: daysAgo(30), to: today() };
    setPreset('30D');
    setCustom(range);
    onApply(range);
  }

  const presets: { key: Preset; labelKey: string }[] = [
    { key: '7D',  labelKey: 'last7Days' },
    { key: '30D', labelKey: 'last30Days' },
    { key: '90D', labelKey: 'last90Days' },
    { key: 'CUSTOM', labelKey: 'custom' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Preset pills */}
        <div className={`flex items-center gap-1.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          {presets.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors border ${
                preset === key
                  ? 'bg-[#5B5FC7] text-white border-[#5B5FC7]'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#5B5FC7]/40 hover:text-[#5B5FC7]'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === 'CUSTOM' && (
          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
              <Calendar
                size={13}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => setCustom((p) => ({ ...p, from: e.target.value }))}
                className={`h-9 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5B5FC7]/50 transition-all ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                dir="ltr"
              />
            </div>
            <span className="text-xs text-gray-400">→</span>
            <div className="relative">
              <Calendar
                size={13}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                max={today()}
                onChange={(e) => setCustom((p) => ({ ...p, to: e.target.value }))}
                className={`h-9 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5B5FC7]/50 transition-all ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                dir="ltr"
              />
            </div>
            <button
              onClick={() => onApply({ from: custom.from, to: custom.to })}
              disabled={!custom.from || !custom.to || loading}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#5B5FC7] text-white hover:bg-[#4a4eb0] transition-colors disabled:opacity-50"
            >
              {t('applyFilter')}
            </button>
          </div>
        )}

        {/* Spacer + refresh */}
        <div className={`flex-1 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={clearFilters}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 mr-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-[#5B5FC7] hover:border-[#5B5FC7]/30 transition-colors disabled:opacity-40"
            aria-label={t('clearFilters') || 'Clear Filters'}
          >
            <X size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">{t('clearFilters') || 'Clear'}</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-[#5B5FC7] hover:border-[#5B5FC7]/30 transition-colors disabled:opacity-40"
            aria-label={t('refresh')}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Active range display */}
      <p className={`mt-2 text-[10px] text-gray-400 font-medium ${isRTL ? 'text-right' : ''}`}>
        {t('showingData')}: {dateRange.from} → {dateRange.to}
      </p>
    </div>
  );
}
