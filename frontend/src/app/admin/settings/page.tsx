'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Settings, Building2, Globe, Package, Bell, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import settingsService from '@/services/settings.service';
import GeneralSettingsForm from './GeneralSettingsForm';
import CompanySettingsForm from './CompanySettingsForm';
import LocalizationSettingsForm from './LocalizationSettingsForm';
import InventorySettingsForm from './InventorySettingsForm';
import NotificationSettingsForm from './NotificationSettingsForm';
import SecuritySettingsForm from './SecuritySettingsForm';
import type { SettingsTab } from './types';

const NAV_ITEMS = [
  { id: 'general'      as SettingsTab, labelKey: 'settingsTabGeneral',      icon: <Settings size={28} />,  bg: '#0A1E36' },
  { id: 'company'      as SettingsTab, labelKey: 'settingsTabCompany',      icon: <Building2 size={28} />, bg: '#0205A6' },
  { id: 'localization' as SettingsTab, labelKey: 'settingsTabLocalization', icon: <Globe size={28} />,     bg: '#F97216' },
  { id: 'inventory'    as SettingsTab, labelKey: 'settingsTabInventory',    icon: <Package size={28} />,   bg: '#0A1E36' },
  { id: 'notification' as SettingsTab, labelKey: 'settingsTabNotification', icon: <Bell size={28} />,      bg: '#0205A6' },
  { id: 'security'     as SettingsTab, labelKey: 'settingsTabSecurity',     icon: <Shield size={28} />,    bg: '#F97216' },
];

export default function AdminSettingsPage() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auth guard — ADMIN or SUPER_ADMIN only.
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN'))) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await settingsService.getSettings();
      setSettings((res as any)?.data?.data ?? (res as any)?.data ?? res);
      setFetchError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('settingsFetchError');
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSettings();
    }
  }, [authLoading, isAuthenticated, fetchSettings]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0A1E36]" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-red-600 font-medium">{fetchError}</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 text-sm rounded-lg bg-[#0A1E36] text-white hover:bg-[#0d2a4a] transition"
        >
          {t('settingsRetry')}
        </button>
      </div>
    );
  }

  const activeItem = NAV_ITEMS.find(i => i.id === activeTab);

  return (
    <div
      className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/30"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Configuration Control Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Configuration Control Panel</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ backgroundColor: isActive ? item.bg : item.bg + 'cc' }}
                className={`relative flex flex-col items-center text-center p-4 rounded-2xl transition-all border-2 ${
                  isActive ? 'border-transparent shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <span className="text-white">{item.icon}</span>
                <span className="mt-2 text-sm font-bold text-white">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 uppercase">
            {activeItem ? t(activeItem.labelKey) : ''} {t('settingsTitle')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settingsSubtitle')}</p>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralSettingsForm settings={settings} onSaved={fetchSettings} />
          )}
          {activeTab === 'company' && (
            <CompanySettingsForm settings={settings} onSaved={fetchSettings} />
          )}
          {activeTab === 'localization' && (
            <LocalizationSettingsForm onSaved={fetchSettings} />
          )}
          {activeTab === 'inventory' && (
            <InventorySettingsForm settings={settings} onSaved={fetchSettings} />
          )}
          {activeTab === 'notification' && (
            <NotificationSettingsForm settings={settings} onSaved={fetchSettings} />
          )}
          {activeTab === 'security' && (
            <SecuritySettingsForm settings={settings} onSaved={fetchSettings} />
          )}
        </div>
      </div>
    </div>
  );
}
