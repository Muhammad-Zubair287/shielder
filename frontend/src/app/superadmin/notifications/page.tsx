'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  Bell, 
  Search, 
  Trash2, 
  CheckCheck, 
  AlertTriangle, 
  Package, 
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  X,
  User,
  Activity,
  Layers,
  Info,
  RefreshCcw,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import notificationService, { Notification, NotificationPreference } from '@/services/notification.service';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function NotificationsPage() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1, totalPages: 1 });

  // Filters
  const [filters, setFilters] = useState({ 
    search: '', 
    type: '', 
    module: '',
    read: undefined as boolean | undefined 
  });
  
  // Detail Panel
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const listParams = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      type: filters.type,
      module: filters.module,
      read: filters.read,
      global: true,
    }),
    [pagination.page, pagination.limit, filters.search, filters.type, filters.module, filters.read]
  );

  const statsQuery = useQuery({
    queryKey: ['superadmin-notifications-stats'],
    queryFn: async () => {
      const { data } = await notificationService.getStats();
      return data.data;
    },
    staleTime: 30 * 1000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['superadmin-notifications-list', listParams],
    queryFn: async () => {
      const { data } = await notificationService.getNotifications(listParams);
      return data;
    },
    enabled: activeTab !== 'preferences',
    staleTime: 15 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const preferencesQuery = useQuery({
    queryKey: ['superadmin-notifications-preferences'],
    queryFn: async () => {
      const { data: responseData } = await notificationService.getPreferences();
      return responseData.data || responseData;
    },
    enabled: activeTab === 'preferences',
    staleTime: 60 * 1000,
  });

  const notifications: Notification[] = notificationsQuery.data?.notifications || [];
  const stats = statsQuery.data || { total: 0, unread: 0, lowStock: 0, system: 0 };
  const statsLoading = statsQuery.isLoading;
  const loading = notificationsQuery.isLoading;
  const prefLoading = preferencesQuery.isLoading;
  const preferences = (preferencesQuery.data as NotificationPreference | null) || null;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-stats'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-stats'] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreference>) => notificationService.updatePreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-preferences'] });
    },
  });

  useEffect(() => {
    const total = notificationsQuery.data?.pagination?.total || 0;
    const pages = notificationsQuery.data?.pagination?.totalPages || 1;
    setPagination(prev => {
      if (prev.total === total && prev.pages === pages) {
        return prev;
      }
      return { ...prev, total, pages };
    });
  }, [notificationsQuery.data]);

  // Reset pagination when search or tab changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters.search, activeTab]);

  // Real-time auto refresh (Requirement 7)
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-stats'] });
      if (activeTab !== 'preferences' && pagination.page === 1) {
        queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-list'] });
      }
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [activeTab, pagination.page, queryClient]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification for audit? It will be soft-deleted.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Notification removed from view');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const togglePreference = async (field: keyof NotificationPreference) => {
    if (!preferences) return;
    const newPrefs = { ...preferences, [field]: !preferences[field] };
    try {
      await updatePreferencesMutation.mutateAsync(newPrefs);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to update preference');
    }
  };

  const openNotificationDetail = (n: Notification) => {
    setSelectedNotification(n);
    setIsPanelOpen(true);
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return <AlertTriangle className="text-red-500" size={18} />;
      case 'ORDER_CREATED': return <Package className="text-blue-500" size={18} />;
      case 'ORDER_COMPLETED': return <CheckCheck className="text-green-500" size={18} />;
      case 'PAYMENT_SUCCESSFUL': 
      case 'PAYMENT_SUCCESS': return <CreditCard className="text-emerald-500" size={18} />;
      case 'NEW_USER_CREATED': return <User className="text-purple-500" size={18} />;
      default: return <Info className="text-gray-500" size={18} />;
    }
  };

  const getModuleBadge = (module: string | null) => {
    if (!module) return null;
    const colors: Record<string, string> = {
      'ORDER': 'bg-blue-100 text-blue-700',
      'INVENTORY': 'bg-red-100 text-red-700',
      'PAYMENT': 'bg-emerald-100 text-emerald-700',
      'USER': 'bg-purple-100 text-purple-700',
      'SYSTEM': 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[module] || 'bg-gray-100 text-gray-700'}`}>
        {module}
      </span>
    );
  };

  const statCards = [
    {
      label: t('notifTotalNotifications'),
      value: stats.total,
      icon: <Bell size={20} />,
      type: '',
      iconClass: 'bg-blue-50 text-blue-600',
      ringClass: 'ring-blue-100',
    },
    {
      label: t('notifUnreadNotifications'),
      value: stats.unread,
      icon: <Clock size={20} />,
      type: 'unread',
      iconClass: 'bg-amber-50 text-amber-600',
      ringClass: 'ring-amber-100',
    },
    {
      label: t('notifSystemAlerts'),
      value: stats.system,
      icon: <Activity size={20} />,
      type: 'SYSTEM_ALERT',
      iconClass: 'bg-violet-50 text-violet-600',
      ringClass: 'ring-violet-100',
    },
    {
      label: t('notifLowStockAlerts'),
      value: stats.lowStock,
      icon: <AlertTriangle size={20} />,
      type: 'LOW_STOCK',
      iconClass: 'bg-rose-50 text-rose-600',
      ringClass: 'ring-rose-100',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 🧭 1️⃣ Top Section – Overview Cards */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl md:text-3xl font-black text-shielder-dark tracking-tight">{t('notificationsTitle')}</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">{t('notificationsSubtitle')}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => setActiveTab('preferences')}
            className="hidden md:inline-flex items-center px-4 h-10 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wide text-shielder-dark hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('notifManageSettings')}
          </button>
          <button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-stats'] });
              queryClient.invalidateQueries({ queryKey: ['superadmin-notifications-list'] });
            }}
            className="h-10 w-10 flex items-center justify-center bg-[#FF6B35]/10 text-[#FF6B35] rounded-xl hover:bg-[#FF6B35]/20 transition-colors"
          >
            <RefreshCcw size={20} className={notificationsQuery.isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div 
            key={i}
            onClick={() => {
              if (card.type === 'unread') setFilters(f => ({ ...f, read: false }));
              else if (card.type) setFilters(f => ({ ...f, type: card.type }));
              else setFilters({ search: '', type: '', module: '', read: undefined });
              setActiveTab('all');
            }}
            className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group ring-1 ${card.ringClass}`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${card.iconClass}`}>
                {card.icon}
              </div>
              <div className={isRTL ? 'text-left' : 'text-right'}>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide leading-none mb-1">{card.label}</p>
                <h3 className="text-3xl font-black text-shielder-dark tabular-nums">{statsLoading ? '...' : card.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔎 3️⃣ Filtering & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex bg-gray-100/50 p-1 rounded-2xl w-full max-w-sm">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'all' ? 'bg-white text-shielder-primary shadow-sm' : 'text-gray-400 hover:text-shielder-dark'
              }`}
            >
              {t('notifTabNotifications')}
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'preferences' ? 'bg-white text-shielder-primary shadow-sm' : 'text-gray-400 hover:text-shielder-dark'
              }`}
            >
              {t('notifTabAuditSettings')}
            </button>
          </div>

          {activeTab !== 'preferences' && (
            <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} size={16} />
                <input 
                  type="text"
                  placeholder={t('notifSearchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className={`py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-shielder-primary/30 focus:border-shielder-primary outline-none transition-all ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                />
              </div>
              <select 
                value={filters.module}
                onChange={(e) => setFilters(f => ({ ...f, module: e.target.value }))}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none font-semibold text-gray-600"
              >
                <option value="">{t('notifAllModules')}</option>
                <option value="ORDER">Orders</option>
                <option value="INVENTORY">Inventory</option>
                <option value="PAYMENT">Payments</option>
                <option value="USER">Users</option>
                <option value="SYSTEM">System</option>
              </select>
              <button 
                onClick={handleMarkAllRead}
                className="flex items-center px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-emerald-100 transition-colors"
              >
                <CheckCheck size={16} className={isRTL ? 'ml-2' : 'mr-2'} /> {t('notifMarkAllRead')}
              </button>
            </div>
          )}
        </div>

        {/* 📋 2️⃣ Notification Table */}
        {activeTab === 'preferences' ? (
          <div className="p-12">
            <div className="max-w-4xl mx-auto">
              <div className="mb-10">
                <h2 className="text-xl font-black text-shielder-dark uppercase tracking-tight">{t('notifAuditPreferencesTitle')}</h2>
                <p className="text-sm text-gray-500 font-medium">{t('notifAuditPreferencesDesc')}</p>
              </div>

              {prefLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-shielder-primary mb-4" size={40} />
                  <p className="text-xs font-black uppercase text-gray-400">{t('notifLoadingConfig')}</p>
                </div>
              ) : !preferences ? (
                <div className="p-10 bg-red-50 text-red-600 rounded-3xl text-center">
                  <AlertTriangle className="mx-auto mb-4" size={40} />
                  <p className="font-bold">Failed to load preference schema.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  <section>
                    <h3 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-6">Real-time Delivery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'orderUpdates', label: 'Order Lifecycle', desc: 'New orders and status changes' },
                        { key: 'lowStock', label: 'Inventory Guard', desc: 'Threshold alerts and stock outs' },
                        { key: 'payments', label: 'Transaction Audit', desc: 'Financial success/failure events' },
                        { key: 'newUser', label: 'Access Control', desc: 'New administrative account creation' },
                        { key: 'inApp', label: 'In-App Dashboard', desc: 'Real-time UI alerts' },
                        { key: 'email', label: 'Email Broadcast', desc: 'External push notifications' },
                      ].map((p) => (
                        <div key={p.key} className="bg-gray-50 p-6 rounded-[32px] flex items-center justify-between hover:bg-white border border-transparent hover:border-gray-100 transition-all group">
                          <div className="flex-1">
                            <h4 className="text-sm font-black text-shielder-dark uppercase tracking-tight">{p.label}</h4>
                            <p className="text-[11px] text-gray-500 font-medium mt-1">{p.desc}</p>
                          </div>
                          <button 
                            onClick={() => togglePreference(p.key as keyof NotificationPreference)}
                            className={`w-12 h-6 rounded-full transition-all relative ${preferences[p.key as keyof NotificationPreference] ? 'bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/20' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all transform ${preferences[p.key as keyof NotificationPreference] ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-6">System Audit Policies</h3>
                    <div className="bg-shielder-dark rounded-[40px] p-8 text-white relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Activity size={120} />
                       </div>
                       <div className="relative z-10 space-y-6">
                          <div className="flex gap-4">
                             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <CheckCheck size={20} className="text-shielder-primary" />
                              </div>
                              <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-shielder-primary">De-duplication Policy</p>
                                 <p className="text-sm text-gray-400 mt-1 leading-relaxed">System automatically filters duplicate events for the same entity within a <span className="text-white font-bold">24-hour window</span> to prevent alert fatigue.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <Layers size={20} className="text-shielder-primary" />
                              </div>
                              <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-shielder-primary">Immutability Standard</p>
                                 <p className="text-sm text-gray-400 mt-1 leading-relaxed">Notifications are <span className="text-white font-bold">Soft-Deleted</span>. Records remain in the secondary audit layer for forensic tracking and cannot be permanently erased.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <Settings size={20} className="text-shielder-primary" />
                              </div>
                              <div>
                                 <p className="text-xs font-black uppercase tracking-widest text-shielder-primary">Contextual Persistence</p>
                                 <p className="text-sm text-gray-400 mt-1 leading-relaxed">Every alert stores <span className="text-white font-bold">Event Type, Module, Related ID,</span> and the <span className="text-white font-bold">Triggering Identity</span> as per compliance requirements.</p>
                              </div>
                          </div>
                       </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('notifIdentityCol')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('notifContextCol')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('status')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('createdAt')}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4"><Bell size={40} /></div>
                        <h4 className="text-lg font-black text-shielder-dark uppercase tracking-tight">{t('notifEmpty')}</h4>
                        <p className="text-gray-400 text-sm max-w-xs mt-2">{t('notifEmptyHint')}</p>
                        <button onClick={() => setFilters({ search: '', type: '', module: '', read: undefined })} className="mt-6 text-shielder-primary text-xs font-black uppercase tracking-widest hover:underline">Reset Filters</button>
                      </div>
                    </td>
                  </tr>
                ) : notifications.map((n) => (
                  <tr key={n.id} className={`hover:bg-gray-50 group transition-colors ${!n.isRead ? 'bg-[#FF6B35]/[0.03]' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border border-gray-100 shadow-sm transition-all ${!n.isRead ? 'bg-white' : 'bg-gray-50'}`}>
                          {getIcon(n.type)}
                        </div>
                        <div>
                          <p className={`text-sm tracking-tight ${!n.isRead ? 'font-black text-shielder-dark' : 'font-semibold text-gray-600'}`}>{n.title}</p>
                          <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                            Source: <span className="text-gray-600 font-bold uppercase tracking-tighter">{n.triggeredBy || 'System'}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.message}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getModuleBadge(n.module)}
                        {n.relatedId && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100 font-mono">
                             ID: {n.relatedId.slice(0, 12)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {n.isRead ? (
                        <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <CheckCheck size={14} className="mr-1" /> Seen
                        </span>
                      ) : (
                        <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-shielder-primary animate-pulse">
                          <div className="w-1.5 h-1.5 bg-[#FF6B35] rounded-full mr-2" /> New Alert
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-700">{format(new Date(n.createdAt), 'MMM d, yyyy')}</span>
                        <span className="text-[10px] font-medium text-gray-400 lowercase">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openNotificationDetail(n)}
                          className="p-2 text-shielder-primary hover:bg-shielder-primary/10 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(n.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {activeTab !== 'preferences' && (pagination.totalPages || pagination.pages || 1) > 1 && (
          <UnifiedPagination
            page={pagination.page}
            totalPages={pagination.totalPages || pagination.pages || 1}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            isRTL={isRTL}
            labels={{
              showing: t('showing'),
              of: t('of'),
              results: t('results'),
              previous: t('previous'),
              next: t('next'),
            }}
            className="p-6"
          />
        )}
      </div>

      {/* 👁 4️⃣ View Notification Details - Side Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-gray-100 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNotification && (
          <div className="h-full flex flex-col h-screen overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  {getIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-shielder-dark uppercase tracking-tight line-clamp-1">{selectedNotification.title}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedNotification.type}</p>
                </div>
              </div>
              <button onClick={() => setIsPanelOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-20">
              <section>
                <h4 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-4">Message Content</h4>
                <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                  <p className="text-gray-700 font-bold leading-relaxed">{selectedNotification.message}</p>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-4">Event Audit Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Triggered Event</p>
                    <p className="text-sm font-bold text-gray-700">{selectedNotification.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Module</p>
                    <p className="text-sm font-bold text-gray-700 uppercase">{selectedNotification.module || 'System'}</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Triggered By</p>
                    <p className="text-sm font-bold text-gray-700">{selectedNotification.triggeredBy || 'Automatic System'}</p>
                  </div>
                   <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Timestamp</p>
                    <p className="text-sm font-bold text-gray-700">{format(new Date(selectedNotification.createdAt), 'MMM d, h:mm:ss a')}</p>
                  </div>
                </div>
              </section>

              {selectedNotification.relatedId && (
                <section>
                  <h4 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-4">Entity Connection</h4>
                  <div className="p-6 bg-shielder-dark text-white rounded-[32px] shadow-xl shadow-shielder-dark/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-shielder-primary uppercase tracking-widest mb-1">Related Identifier</p>
                        <h5 className="font-mono text-xl font-black">{selectedNotification.relatedId}</h5>
                      </div>
                      <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {selectedNotification.user && (
                <section>
                  <h4 className="text-[10px] font-black text-shielder-primary uppercase tracking-[0.2em] mb-4">Targeted Recipient</h4>
                  <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl">
                    <div className="w-12 h-12 bg-shielder-primary/10 text-shielder-primary flex items-center justify-center rounded-xl font-black">
                      {selectedNotification.user.profile?.fullName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-shielder-dark">{selectedNotification.user.profile?.fullName || 'System User'}</p>
                      <p className="text-xs text-gray-500 font-medium">{selectedNotification.user.email}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
            
            <div className="absolute bottom-0 inset-x-0 p-6 bg-white border-t border-gray-50 flex gap-3">
               <button 
                  onClick={() => handleDelete(selectedNotification.id)}
                  className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all"
               >
                 Archive Alert
               </button>
               <button 
                  onClick={() => setIsPanelOpen(false)}
                  className="flex-[2] py-4 bg-shielder-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-shielder-dark/20 hover:scale-105 transition-transform"
               >
                 Close Inspector
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for panel */}
      {isPanelOpen && (
        <div 
          onClick={() => setIsPanelOpen(false)}
          className="fixed inset-0 bg-shielder-dark/60 backdrop-blur-sm z-[90] transition-opacity duration-500"
        />
      )}
    </div>
  );
}
