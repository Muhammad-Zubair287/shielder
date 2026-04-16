'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Settings, 
  ShoppingCart, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  Database, 
  History,
  Save,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Upload,
  UploadCloud,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Banknote,
  Landmark,
  Globe
} from 'lucide-react';
import settingsService, { SystemSettings } from '@/services/settings.service';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/helpers';
import { format } from 'date-fns';
import { ApiErrorResponse } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

type TabType = 'general' | 'order' | 'payment' | 'notification' | 'security' | 'backup' | 'logs';

export default function SettingsPage() {
    const { t, isRTL } = useLanguage();
    // Logo upload state and ref (for general tab)
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, onChange: OnChangeType) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingLogo(true);
      try {
        const { data } = await settingsService.uploadCompanyLogo(file);
        onChange('companyLogo', data.data.companyLogo);
        toast.success(t('settingLogoUpdated'));
      } catch (err) {
        toast.error(t('settingLogoFailed'));
      } finally {
        setUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form states
  const [formData, setFormData] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetchSettings();
    
    // Check for tab in URL
    if (typeof window !== 'undefined') {
       const params = new URLSearchParams(window.location.search);
       const tab = params.get('tab') as TabType;
       if (tab && ['general', 'order', 'payment', 'notification', 'security', 'backup', 'logs'].includes(tab)) {
         setActiveTab(tab);
       }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await settingsService.getSettings();
      // Normalize nulls so controlled inputs never get null values
      const raw = data.data || {};
      const normalized: SystemSettings = {
        ...raw,
        companyLogo: raw.companyLogo ?? null,
        companyEmail: raw.companyEmail ?? '',
        companyPhone: raw.companyPhone ?? '',
        companyAddress: raw.companyAddress ?? '',
        paymentMethodsEnabled: Array.isArray(raw.paymentMethodsEnabled) ? raw.paymentMethodsEnabled : [],
        paymentGatewayApiKey: raw.paymentGatewayApiKey ?? '',
        paymentGatewaySecretKey: raw.paymentGatewaySecretKey ?? '',
        paymentWebhookUrl: raw.paymentWebhookUrl ?? '',
        roleNotificationMappings: raw.roleNotificationMappings ?? null,
        autoCancelUnpaidOrdersHours: raw.autoCancelUnpaidOrdersHours ?? null,
        lastBackupDate: raw.lastBackupDate ?? null,
        autoBackupSchedule: raw.autoBackupSchedule ?? null,
      };
      setFormData(normalized);
    } catch (err) {
      toast.error(t('settingLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await settingsService.getLogs({ page: 1, limit: 100 });
      // Handle different response structures
      const logsData = response.data?.logs || response.data?.data?.logs || [];
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
      toast.error(t('settingLogsFailed') || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean | string[] | null) => {
    setFormData((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async (section: TabType) => {
    // Critical sections require password verification
    const criticalSections: TabType[] = ['payment', 'security', 'backup'];
    
    if (criticalSections.includes(section)) {
      setPendingAction(() => () => performSave(section));
      setShowConfirmModal(true);
      return;
    }

    performSave(section);
  };

  const performSave = async (section: TabType) => {
    setSaving(true);
    try {
      await settingsService.updateSettings(section, formData as SystemSettings);
      toast.success(t('settingsSaved'));
      fetchSettings(); // Refresh to get masked values/audit updates
    } catch (err) {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
      setVerifyPassword('');
    }
  };

  const handleVerifyAndProceed = async () => {
    if (!verifyPassword) return;
    setVerifying(true);
    try {
      await settingsService.verifyPassword(verifyPassword);
      if (pendingAction) {
        pendingAction();
      }
    } catch (err) {
      toast.error(t('settingPasswordInvalid'));
    } finally {
      setVerifying(false);
    }
  };

  const sidebarItems = [
    { id: 'general',      label: t('settingTabGeneral'),      icon: <Settings size={28} />,    bg: '#0A1E36' },
    { id: 'order',        label: t('settingTabOrder'),        icon: <ShoppingCart size={28} />, bg: '#0205A6' },
    { id: 'payment',      label: t('settingTabPayment'),      icon: <CreditCard size={28} />,  bg: '#F97216'  },
    { id: 'notification', label: t('settingTabNotification'), icon: <Bell size={28} />,        bg: '#0A1E36'  },
    { id: 'security',     label: t('settingTabSecurity'),     icon: <ShieldCheck size={28} />, bg: '#0205A6'  },
    { id: 'backup',       label: t('settingTabBackup'),       icon: <Database size={28} />,    bg: '#F97216'  },
    { id: 'logs',         label: t('settingTabLogs'),         icon: <History size={28} />,     bg: '#475569'  },
  ];

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shielder-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Configuration Control Panel — always visible top nav */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Configuration Control Panel</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                style={{ backgroundColor: item.bg }}
                className={`relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transform-gpu transition-all duration-300 ${
                  isActive
                    ? 'z-20 -translate-y-2 scale-[1.04] border-white/25 shadow-[0_18px_35px_rgba(0,0,0,0.28)]'
                    : 'z-0 border-transparent opacity-75 saturate-90 grayscale-0 hover:opacity-90 hover:saturate-100 hover:-translate-y-0.5'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-white' : 'text-white/80'}`}>
                  {item.icon}
                </span>
                <span className={`mt-2 text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-white/80'}`}>
                  {item.label}
                </span>
                {/* <span className={`mt-1 text-[10px] leading-tight line-clamp-2 ${isLight ? 'text-gray-400' : 'text-white/70'}`}>
                  {item.desc}
                </span> */}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 uppercase">
            {sidebarItems.find(i => i.id === activeTab)?.label} Settings
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settingManageDesc')}</p>
        </div>

        <div className="p-6">
          {activeTab === 'general' && renderGeneralTab(formData, handleInputChange, uploadingLogo, fileInputRef, handleLogoUpload, t)}
          {activeTab === 'order' && renderOrderTab(formData, handleInputChange, t)}
          {activeTab === 'payment' && renderPaymentTab(formData, handleInputChange, t, showSecret, setShowSecret)}
          {activeTab === 'notification' && renderNotificationTab(formData, handleInputChange, t)}
          {activeTab === 'security' && renderSecurityTab(formData, handleInputChange, t)}
          {activeTab === 'backup' && renderBackupTab(formData, handleInputChange, () => setShowConfirmModal(true), () => setPendingAction(() => () => triggerBackup()), t)}
          {activeTab === 'logs' && <LogsTab logs={logs} loading={logsLoading} t={t} />}

          {/* Save Changes button */}
          {activeTab !== 'logs' && activeTab !== 'backup' && (
            <div className="flex justify-end mt-8">
              <button
                onClick={() => handleSave(activeTab)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[#F97216] text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#e56510] transition-all shadow-md disabled:opacity-50"
              >
                {saving ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}
                {t('saveChanges')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-shielder-dark/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-shielder-dark uppercase tracking-tight mb-2">{t('settingIdentityVerification')}</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">{t('settingIdentityVerificationDesc')}</p>
              
              <div className="space-y-4">
                <input 
                  type="password"
                  placeholder={t('settingAdminPassword')}
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-shielder-primary text-center font-bold tracking-widest"
                />
                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => { setShowConfirmModal(false); setVerifyPassword(''); }}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-shielder-dark"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleVerifyAndProceed}
                    disabled={verifying || !verifyPassword}
                    className="flex-1 py-4 bg-[#FF6B35] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50"
                  >
                    {verifying ? t('settingVerifying') : t('settingAuthorizeAction')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function triggerBackup() {
    toast.promise(
      settingsService.triggerBackup(),
      {
        loading: t('settingBackupProgress'),
        success: t('settingBackupSuccess'),
        error: t('settingBackupFailed')
      }
    ).then(() => {
      fetchSettings();
      setShowConfirmModal(false);
      setVerifyPassword('');
    });
  }
}

// --------------------------------------------------------------------------------
// TAB RENDER FUNCTIONS
// --------------------------------------------------------------------------------

type OnChangeType = (f: string, v: string | number | boolean | string[] | null) => void;

function renderGeneralTab(
  data: SystemSettings,
  onChange: OnChangeType,
  uploadingLogo: boolean,
  fileInputRef: React.RefObject<HTMLInputElement>,
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, onChange: OnChangeType) => void,
  t: (key: string) => string
) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingSystemName')}</label>
            <input
              type="text"
              value={data.systemName}
              onChange={(e) => onChange('systemName', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingCompanyName')}</label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingCompanyEmail')}</label>
            <input
              type="email"
              value={data.companyEmail}
              onChange={(e) => onChange('companyEmail', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingCompanyPhone')}</label>
            <input
              type="text"
              value={data.companyPhone}
              onChange={(e) => onChange('companyPhone', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-sm font-medium text-gray-700 mb-4">{t('settingCompanyLogo')}</p>
            <div className="w-24 h-24 bg-white rounded-xl border border-gray-200 mx-auto mb-4 flex items-center justify-center overflow-hidden relative">
              {data.companyLogo ? (
                <Image
                  src={getImageUrl(data.companyLogo) || ''}
                  alt="Logo"
                  className="object-contain p-2"
                  fill
                />
              ) : (
                <UploadCloud className="text-gray-300" size={32} />
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-medium">{t('settingUploading')}</div>
              )}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={e => handleLogoUpload(e, onChange)}
            />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-shielder-primary hover:underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              <UploadCloud size={15} />
              {uploadingLogo ? t('settingUploading') : t('settingUploadNewFile')}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingPhysicalAddress')}</label>
            <textarea
              rows={4}
              value={data.companyAddress}
              onChange={(e) => onChange('companyAddress', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Localization & Format */}
      <fieldset className="border border-gray-200 rounded-xl px-5 pt-3 pb-5">
        <legend className="text-sm font-medium text-gray-600 px-1">Localization &amp; Format</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingCurrencyLabel')}</label>
            <select
              value={data.currency}
              onChange={(e) => onChange('currency', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="SAR">SAR (ر.س)</option>
              <option value="PKR">PKR (Rs.)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingTimezoneLabel')}</label>
            <select
              value={data.timezone}
              onChange={(e) => onChange('timezone', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (GMT-5)</option>
              <option value="America/Chicago">Central Time (GMT-6)</option>
              <option value="America/Los_Angeles">Pacific Time (GMT-8)</option>
              <option value="Europe/London">London (GMT+0)</option>
              <option value="Europe/Paris">Paris (GMT+1)</option>
              <option value="Asia/Dubai">Dubai (GMT+4)</option>
              <option value="Asia/Riyadh">Riyadh (GMT+3)</option>
              <option value="Asia/Karachi">Karachi (GMT+5)</option>
              <option value="Asia/Kolkata">India (GMT+5:30)</option>
              <option value="Asia/Shanghai">Shanghai (GMT+8)</option>
              <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settingDateFormat')}</label>
            <select
              value={data.dateFormat}
              onChange={(e) => onChange('dateFormat', e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary focus:border-transparent"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function renderOrderTab(data: SystemSettings, onChange: OnChangeType, t: (key: string) => string) {
  const Toggle = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-[#FF6B35]' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{t('settingDefaultOrderStatus')}</label>
        <select
          value={data.defaultOrderStatus}
          onChange={(e) => onChange('defaultOrderStatus', e.target.value)}
          className="w-full md:w-64 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-shielder-primary"
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Auto-Complete */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <Toggle checked={data.autoCompleteOrderAfterPayment} onToggle={() => onChange('autoCompleteOrderAfterPayment', !data.autoCompleteOrderAfterPayment)} />
          </div>
          <h4 className="text-sm font-bold text-shielder-dark uppercase mt-4">{t('settingAutoComplete')}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('settingAutoCompleteDesc')}</p>
        </div>

        {/* Partial Payments */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
              <CreditCard size={22} />
            </div>
            <Toggle checked={data.allowPartialPayment} onToggle={() => onChange('allowPartialPayment', !data.allowPartialPayment)} />
          </div>
          <h4 className="text-sm font-bold text-shielder-dark uppercase mt-4">{t('settingPartialPayments')}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('settingPartialPaymentsDesc')}</p>
        </div>

        {/* Customer Cancellations */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <Toggle checked={data.allowOrderCancellation} onToggle={() => onChange('allowOrderCancellation', !data.allowOrderCancellation)} />
          </div>
          <h4 className="text-sm font-bold text-shielder-dark uppercase mt-4">{t('settingCancellations')}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('settingCancellationsDesc')}</p>
        </div>

        {/* Zombie Order Cleanup */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400 shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-shielder-dark uppercase">{t('settingZombieCleanup')}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{t('settingZombieCleanupDesc')}</p>
              </div>
            </div>
            <div className="border border-gray-300 rounded-lg flex items-center shrink-0">
              <input
                type="number"
                min={1}
                value={data.autoCancelUnpaidOrdersHours || ''}
                onChange={(e) => onChange('autoCancelUnpaidOrdersHours', parseInt(e.target.value) || null)}
                className="w-14 px-2 py-1.5 text-center text-sm font-medium outline-none rounded-l-lg"
              />
              <div className="border-l border-gray-300 flex flex-col">
                <button className="px-1.5 py-0.5 hover:bg-gray-50 text-gray-400 text-xs leading-none rounded-tr-lg" onClick={() => onChange('autoCancelUnpaidOrdersHours', (data.autoCancelUnpaidOrdersHours || 0) + 1)}>▲</button>
                <button className="px-1.5 py-0.5 hover:bg-gray-50 text-gray-400 text-xs leading-none rounded-br-lg border-t border-gray-300" onClick={() => onChange('autoCancelUnpaidOrdersHours', Math.max(0, (data.autoCancelUnpaidOrdersHours || 0) - 1))}>▼</button>
              </div>
            </div>
          </div>
          <div className="relative mt-4">
            <input
              type="text"
              readOnly
              value={data.autoCancelUnpaidOrdersHours ? '' : ''}
              placeholder={t('Disabled')}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('settingHours')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPaymentTab(data: SystemSettings, onChange: OnChangeType, t: (key: string) => string, showSecret: boolean, setShowSecret: (v: boolean | ((prev: boolean) => boolean)) => void) {

  const methodIcons: Record<string, React.ReactNode> = {
    CASH:           <Banknote size={22} />,
    BANK_TRANSFER:  <Landmark size={22} />,
    CREDIT_CARD:    <CreditCard size={22} />,
    ONLINE_GATEWAY: <Globe size={22} />,
  };

  const toggleMethod = (method: string, checked: boolean) => {
    const current = data.paymentMethodsEnabled || [];
    const next = checked ? [...current, method] : current.filter((m: string) => m !== method);
    onChange('paymentMethodsEnabled', next);
  };

  return (
    <div className="space-y-8">
      {/* API Keys — dark card */}
      <div className="bg-[#1a1f2e] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Public API Key</label>
          <input
            type="text"
            value={data.paymentGatewayApiKey || ''}
            onChange={(e) => onChange('paymentGatewayApiKey', e.target.value)}
            className="w-full px-4 py-2.5 bg-[#111827] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-shielder-primary font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Private Secret Key</label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={data.paymentGatewaySecretKey || ''}
              onChange={(e) => onChange('paymentGatewaySecretKey', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#111827] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-shielder-primary font-mono pr-20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" onClick={() => setShowSecret(v => !v)} className="text-gray-400 hover:text-gray-200 transition-colors">
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button type="button" onClick={() => navigator.clipboard.writeText(data.paymentGatewaySecretKey || '')} className="text-gray-400 hover:text-gray-200 transition-colors">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">{t('settingOnlinePayEnabled')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('settingOnlinePayDesc')}</p>
          </div>
          <button onClick={() => onChange('onlinePaymentEnabled', !data.onlinePaymentEnabled)} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${data.onlinePaymentEnabled ? 'bg-[#FF6B35]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.onlinePaymentEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">{t('settingProductionMode')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('settingProductionModeDesc')}</p>
          </div>
          <button onClick={() => onChange('paymentTestMode', !data.paymentTestMode)} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${!data.paymentTestMode ? 'bg-[#FF6B35]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${!data.paymentTestMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">{t('settingWebhookEndpoint')}</p>
          <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-500 break-all select-all">
            {process.env.NEXT_PUBLIC_API_URL || 'https://api.shielder-filters.com'}/settings/payments/webhook
          </code>
        </div>
      </div>

      {/* Disbursement Methods */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('settingDisbursementMethods')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'ONLINE_GATEWAY'] as const).map(method => {
            const active = data.paymentMethodsEnabled?.includes(method);
            return (
              <button
                key={method}
                onClick={() => toggleMethod(method, !active)}
                className={`flex items-center justify-between px-5 py-4 border rounded-xl transition-all ${active ? 'border-[#FF6B35] bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <span className={`text-sm font-bold uppercase tracking-wide ${active ? 'text-[#FF6B35]' : 'text-gray-800'}`}>{method.replace(/_/g, ' ')}</span>
                <span className={`p-2 rounded-lg ${active ? 'bg-orange-50 text-[#FF6B35]' : 'bg-gray-100 text-gray-400'}`}>
                  {methodIcons[method]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderNotificationTab(data: SystemSettings, onChange: OnChangeType, t: (key: string) => string) {
  const renderToggle = (
    key: keyof SystemSettings,
    label: string,
    description: string,
    disabled = false,
    checkedOverride?: boolean
  ) => {
    const checked = checkedOverride ?? Boolean(data[key]);

    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(key, !checked)}
          className={[
            'relative inline-flex flex-shrink-0 h-6 w-11 rounded-full border-2 border-transparent transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40',
            checked ? 'bg-[#FF6B35]' : 'bg-gray-200',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
              checked ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-0.5">{t('settingsNotifChannels')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('settingsNotifChannelsDesc')}</p>

        <div className="space-y-2">
          {renderToggle(
            'enableEmailNotifications',
            t('settingsEnableEmail'),
            t('settingsEnableEmailDesc')
          )}
          {renderToggle(
            'enableEmailNotifications',
            t('settingsEnableInApp'),
            t('settingsEnableInAppDesc'),
            true,
            true
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800 mb-0.5">{t('settingsNotifAlerts')}</h3>
        <p className="text-xs text-gray-400">{t('settingsNotifAlertsDesc')}</p>

        <div className="space-y-2">
          {renderToggle(
            'enableLowStockAlerts',
            t('settingsLowStockAlertToggle'),
            t('settingsLowStockAlertToggleDesc')
          )}
          {renderToggle(
            'enableOrderStatusNotifications',
            t('settingsOrderStatusAlerts'),
            t('settingsOrderStatusAlertsDesc')
          )}
          {renderToggle(
            'enablePaymentNotifications',
            t('settingsPaymentAlerts'),
            t('settingsPaymentAlertsDesc')
          )}
        </div>

        <div className="pt-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('settingsLowStockThreshold')}</label>
          <p className="text-xs text-gray-400 mb-2">{t('settingsLowStockThresholdHint')}</p>
          <div className="max-w-[220px]">
            <input
              type="number"
              min={0}
              value={Number(data.lowStockThreshold ?? 0)}
              onChange={(e) => onChange('lowStockThreshold', Number(e.target.value))}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSecurityTab(data: SystemSettings, onChange: OnChangeType, t: (key: string) => string) {
  const getRangeStyle = (value: number, min: number, max: number): React.CSSProperties => {
   const percent = ((value - min) / (max - min)) * 100;
   return {
    background: `linear-gradient(90deg, #FF6B35 0%, #FF6B35 ${percent}%, #d9dde5 ${percent}%, #d9dde5 100%)`,
   };
  };

  const sliderClassName =
   'w-full h-2 rounded-full appearance-none cursor-pointer ' +
   '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ' +
    '[&::-webkit-slider-thumb]:bg-[#FF6B35] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md ' +
    '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#FF6B35] ' +
   '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md';

  return (
    <div className="space-y-10">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="bg-gray-50/60 p-6 rounded-3xl border border-gray-200 shadow-sm">
         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">{t('settingPasswordComplexity')}</label>
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">{t('settingMinLength')}</span>
                <span className="text-sm font-black text-shielder-dark">{data.passwordMinLength} {t('settingChars')}</span>
             </div>
             <input 
               type="range" min="8" max="32" 
               value={data.passwordMinLength}
               onChange={(e) => onChange('passwordMinLength', parseInt(e.target.value))}
          style={getRangeStyle(Number(data.passwordMinLength), 8, 32)}
          className={sliderClassName}
             />
         <p className="text-[11px] text-gray-500 mt-2 text-right">Strong: 12+</p>
          </div>

       <div className="bg-gray-50/60 p-6 rounded-3xl border border-gray-200 shadow-sm">
         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">{t('settingLoginHardening')}</label>
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">{t('settingMaxFailedRetries')}</span>
                <span className="text-sm font-black text-shielder-dark">{data.maxLoginAttempts} {t('settingAttempts')}</span>
             </div>
             <input 
               type="range" min="3" max="20" 
               value={data.maxLoginAttempts}
               onChange={(e) => onChange('maxLoginAttempts', parseInt(e.target.value))}
          style={getRangeStyle(Number(data.maxLoginAttempts), 3, 20)}
          className={sliderClassName}
             />
         <p className="text-[11px] text-gray-500 mt-2 text-right">Recommended: 3-5</p>
          </div>

       <div className="bg-gray-50/60 p-6 rounded-3xl border border-gray-200 shadow-sm">
         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">{t('settingSessionMgmt')}</label>
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">{t('settingTimeoutMins')}</span>
                <span className="text-sm font-black text-shielder-dark">{data.sessionTimeoutMinutes} {t('settingMinUnit')}</span>
             </div>
             <input 
               type="range" min="5" max="480" 
               value={data.sessionTimeoutMinutes}
               onChange={(e) => onChange('sessionTimeoutMinutes', parseInt(e.target.value))}
          style={getRangeStyle(Number(data.sessionTimeoutMinutes), 5, 480)}
          className={sliderClassName}
             />
         <p className="text-[11px] text-gray-500 mt-2 text-right">Consider user convenience vs. security</p>
          </div>

       <div className="bg-gray-50/60 p-6 rounded-3xl border border-gray-200 shadow-sm">
         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">{t('settingAccountLock')}</label>
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">{t('settingLockTimeMins')}</span>
                <span className="text-sm font-black text-shielder-dark">{data.accountLockDurationMinutes} {t('settingMinUnit')}</span>
             </div>
             <input 
               type="range" min="1" max="60" 
               value={data.accountLockDurationMinutes}
               onChange={(e) => onChange('accountLockDurationMinutes', parseInt(e.target.value))}
          style={getRangeStyle(Number(data.accountLockDurationMinutes), 1, 60)}
          className={sliderClassName}
             />
         <p className="text-[11px] text-gray-500 mt-2 text-right">Balanced: 15-30 mins</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 flex items-center justify-between">
             <div className="flex gap-4">
                <ShieldAlert className="text-red-600" size={24} />
                <div>
                   <h4 className="text-sm font-black text-shielder-dark uppercase tracking-tight">{t('settingForceStrongPw')}</h4>
                   <p className="text-[10px] text-gray-500 font-medium">{t('settingForceStrongPwDesc')}</p>
                </div>
             </div>
             <button 
                onClick={() => onChange('forceStrongPasswords', !data.forceStrongPasswords)}
                className={`w-12 h-6 rounded-full transition-all relative ${data.forceStrongPasswords ? 'bg-red-600 shadow-lg shadow-red-200' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all transform ${data.forceStrongPasswords ? 'translate-x-6' : ''}`} />
              </button>
          </div>

          <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100 flex items-center justify-between">
             <div className="flex gap-4">
                <Lock className="text-purple-600" size={24} />
                <div>
                   <h4 className="text-sm font-black text-shielder-dark uppercase tracking-tight">{t('settingTwoFactor')}</h4>
                   <p className="text-[10px] text-gray-500 font-medium">{t('settingTwoFactorDesc')}</p>
                </div>
             </div>
             <button 
                onClick={() => onChange('enableTwoFactorAuth', !data.enableTwoFactorAuth)}
                className={`w-12 h-6 rounded-full transition-all relative ${data.enableTwoFactorAuth ? 'bg-purple-600 shadow-lg shadow-purple-200' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all transform ${data.enableTwoFactorAuth ? 'translate-x-6' : ''}`} />
              </button>
          </div>
       </div>
    </div>
  );
}

function renderBackupTab(data: SystemSettings, onChange: OnChangeType, onVerify: () => void, onProceed: () => void, t: (key: string) => string) {
  return (
    <div className="space-y-12">
      <div className="bg-indigo-600 rounded-[40px] p-10 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
            <Database size={120} />
         </div>
         <div className="relative z-10">
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{t('settingManualSnapshot')}</h3>
            <p className="text-indigo-100 text-sm max-w-md">{t('settingManualSnapshotDesc')}</p>
            <div className="mt-8 flex flex-wrap gap-4">
               <button 
                  onClick={() => { onVerify(); onProceed(); }}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl"
               >
                  <UploadCloud size={18} />
                  {t('settingInitiateBackup')}
               </button>
               <div className="flex items-center gap-3 px-6 py-4 bg-indigo-500/30 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="text-left">
                     <p className="text-[10px] font-black uppercase text-indigo-200">{t('settingLastSync')}</p>
                     <p className="text-xs font-bold">{data.lastBackupDate ? format(new Date(data.lastBackupDate), 'MMM dd, yyyy HH:mm') : t('settingNever')}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-gray-50 p-8 rounded-[36px] border border-gray-100">
            <h4 className="text-sm font-black text-shielder-dark uppercase tracking-tight mb-6">{t('settingAutomationSchedule')}</h4>
            <div className="space-y-4">
               {[
                 { key: 'nightly', label: t('settingEveryNight') },
                 { key: 'weekly', label: t('settingWeeklySunday') },
                 { key: 'never', label: t('settingNeverManual') }
               ].map(schedule => (
                 <label key={schedule.key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer hover:border-indigo-400 transition-all group">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-shielder-dark">{schedule.label}</span>
                    <input type="radio" name="schedule" className="accent-indigo-600 w-4 h-4" defaultChecked={schedule.key === 'never'} />
                 </label>
               ))}
            </div>
         </div>

         <div className="bg-red-50/30 p-8 rounded-[36px] border border-red-100 border-dashed">
            <h4 className="text-sm font-black text-red-600 uppercase tracking-tight mb-2">{t('settingCriticalRecovery')}</h4>
            <p className="text-[11px] text-gray-500 font-medium mb-6">{t('settingCriticalRecoveryDesc')}</p>
            <button className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100">
               <Upload size={18} />
               {t('settingUploadRestore')}
            </button>
         </div>
      </div>
    </div>
  );
}

interface SystemLog {
  id: string;
  user?: {
    profile?: {
      fullName?: string;
    };
  };
  ipAddress?: string;
  action: string;
  changes?: {
    field: string;
    old: string | number | boolean | null;
    new: string | number | boolean | null;
  };
  createdAt: string;
}

function LogsTab({ logs, loading, t }: { logs: SystemLog[]; loading: boolean; t: (key: string) => string }) {
  const [search, setSearch] = React.useState('');
  const [filterAdmin, setFilterAdmin] = React.useState('all');
  const [filterAction, setFilterAction] = React.useState('all');

  const actionColors: Record<string, string> = {
    SECURITY:     'bg-orange-100 text-orange-700',
    GENERAL:      'bg-blue-100 text-blue-700',
    ORDER:        'bg-green-100 text-green-700',
    PAYMENT:      'bg-purple-100 text-purple-700',
    NOTIFICATION: 'bg-yellow-100 text-yellow-700',
    BACKUP:       'bg-indigo-100 text-indigo-700',
  };

  const getActionLabel = (action: string) => action.replace('UPDATE_SETTING_', '');

  // Safely build admin and action lists
  const admins = Array.from(new Set(
    (logs || []).map(l => l?.user?.profile?.fullName || 'Admin').filter(Boolean)
  ));
  const actions = Array.from(new Set(
    (logs || []).map(l => getActionLabel(l?.action || '')).filter(Boolean)
  ));

  const filtered = (logs || []).filter(log => {
    const name = log.user?.profile?.fullName || 'Admin';
    const label = getActionLabel(log.action);
    const field = log.changes?.field || '';
    const searchLower = search.toLowerCase();
    
    // Enhanced search: searches in admin name, field, action, and values
    const matchSearch = !search || 
      name.toLowerCase().includes(searchLower) || 
      field.toLowerCase().includes(searchLower) ||
      label.toLowerCase().includes(searchLower) ||
      String(log.changes?.old || '').toLowerCase().includes(searchLower) ||
      String(log.changes?.new || '').toLowerCase().includes(searchLower);
    
    const matchAdmin = filterAdmin === 'all' || name === filterAdmin;
    const matchAction = filterAction === 'all' || label === filterAction;
    return matchSearch && matchAdmin && matchAction;
  });

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shielder-primary mx-auto mb-4"></div>
        <p className="text-sm text-gray-400">{t('settingParsingRecords') || 'Loading audit logs...'}</p>
      </div>
    );
  }

  const renderModification = (log: SystemLog) => {
    const oldVal = String(log.changes?.old ?? '');
    const newVal = String(log.changes?.new ?? '');
    const isImage = oldVal.includes('upload') || newVal.includes('upload');

    const truncatePath = (path: string) => {
      const filename = path.split('/').pop() || path;
      return filename.length > 24 ? filename.slice(0, 22) + '…' : filename;
    };

    if (isImage) {
      return (
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-mono truncate max-w-[130px]" title={oldVal}>
            {truncatePath(oldVal)}
          </span>
          <span className="text-gray-400 shrink-0">⇄</span>
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono truncate max-w-[130px]" title={newVal}>
            {truncatePath(newVal)}
          </span>
        </div>
      );
    }
    if (!oldVal && !newVal) return <span className="text-gray-300 text-xs">—</span>;
    if (!oldVal || oldVal === 'null') return <span className="bg-red-50 text-red-400 text-xs px-2 py-0.5 rounded">null</span>;
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded font-medium">{oldVal}</span>
        <span className="text-gray-400 text-xs">→</span>
        <span className="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded font-medium">{newVal}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
        <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white">
          <option value="all">All Admins</option>
          {admins.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white">
          <option value="all">All Actions</option>
          {actions.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-500 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Last 30 Days
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-auto">{filtered.length} of {(logs || []).length} logs</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Field</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modification</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const name = log.user?.profile?.fullName || 'Admin';
              const initial = name[0].toUpperCase();
              const actionLabel = getActionLabel(log.action);
              const badgeClass = actionColors[actionLabel] || 'bg-gray-100 text-gray-600';
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">{initial}</div>
                      <span className="text-xs font-semibold text-gray-700 uppercase">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${badgeClass}`}>{actionLabel}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{log.changes?.field || '—'}</td>
                  <td className="px-4 py-4">{renderModification(log)}</td>
                  <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">{format(new Date(log.createdAt), 'MMM dd, yyyy, HH:mm')}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="text-sm text-gray-400">
                    <p className="font-medium">{t('settingNoAuditEvents') || 'No matching audit logs'}</p>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
