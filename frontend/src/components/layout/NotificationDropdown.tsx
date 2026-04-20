'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import notificationService, { Notification } from '@/services/notification.service';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const extractUnreadCount = (payload: any): number => {
    const raw = payload?.data?.count ?? payload?.count ?? 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const extractStatsUnreadCount = (payload: any): number => {
    const raw = payload?.data?.unread ?? payload?.unread ?? 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const fetchUnreadCount = async () => {
    try {
      if (user?.role === 'SUPER_ADMIN') {
        const { data } = await notificationService.getStats();
        setUnreadCount(extractStatsUnreadCount(data));
        return;
      }

      const { data } = await notificationService.getUnreadCount();
      setUnreadCount(extractUnreadCount(data));
    } catch (err) {
      console.error('Failed to fetch unread count');
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await notificationService.getNotifications({
        limit: 5,
        ...(user?.role === 'SUPER_ADMIN' ? { global: true, read: false } : {}),
      });
      setNotifications(data?.notifications ?? data?.data?.notifications ?? []);
    } catch (err) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const getNotificationHref = (notification: Notification) => {
    const base = user?.role === 'ADMIN' ? '/admin' : '/superadmin';
    const notificationType = (notification.type || '').toUpperCase();
    const moduleName = (notification.module || '').toUpperCase();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();

    if (notificationType === 'LOW_STOCK') return `${base}/products?filter=lowstock`;
    if (notificationType === 'NEW_USER_CREATED') return `${base}/users`;

    if (notificationType.startsWith('ORDER')) {
      return notification.relatedId ? `${base}/orders/${notification.relatedId}` : `${base}/orders`;
    }

    if (notificationType.startsWith('QUOTATION')) {
      return notification.relatedId ? `${base}/quotations/${notification.relatedId}` : `${base}/quotations`;
    }

    if (
      moduleName.includes('PRODUCT') ||
      title.includes('pending approval') ||
      message.includes('pending approval')
    ) {
      return user?.role === 'ADMIN' ? '/admin/approvals' : '/superadmin/products?status=PENDING';
    }

    return notificationsLink;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    router.push(getNotificationHref(notification));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      if (user?.role === 'SUPER_ADMIN') {
        setNotifications([]);
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const deleted = notifications.find(n => n.id === id);
      if (deleted && !deleted.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification');
    }
  };

  const notificationsLink = user?.role === 'ADMIN' ? '/admin/notifications' : '/superadmin/notifications';

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${isOpen ? 'bg-gray-100 dark:bg-white/5 text-shielder-primary dark:text-[#ff8a5b]' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-shielder-critical text-white text-[10px] font-bold px-1 min-w-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 mt-2 w-auto md:w-96 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 z-[200] overflow-hidden transform origin-top-right transition-all">
          <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/70">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-shielder-primary dark:text-[#ff8a5b] hover:underline flex items-center"
              >
                <Check size={14} className="mr-1" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 space-y-3">
                <Loader2 className="animate-spin text-shielder-primary dark:text-[#ff8a5b]" size={24} />
                <span className="text-sm text-gray-500 dark:text-slate-400">Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center space-y-2">
                <div className="w-12 h-12 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600">
                  <Bell size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No new notifications</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Everything is up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group ${!notification.isRead ? 'bg-blue-50/30 dark:bg-slate-900/70' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleNotificationClick(notification);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between space-x-3">
                      <div className={`mt-1 p-1.5 rounded-lg flex-shrink-0 ${
                        notification.type === 'LOW_STOCK' ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300' :
                        notification.type.startsWith('ORDER') ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300' :
                        'bg-gray-100 text-gray-600 dark:bg-slate-900 dark:text-slate-400'
                      }`}>
                        <Bell size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.isRead ? 'text-gray-600 dark:text-slate-400' : 'text-gray-900 dark:text-slate-100 font-bold'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1.5 flex items-center">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-shielder-primary dark:bg-[#ff8a5b] mt-2" />
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-all rounded"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link 
            href={notificationsLink}
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5 border-t border-gray-50 dark:border-slate-800 transition-colors bg-gray-50/20 dark:bg-slate-900/50"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
};
