'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  Layers,
  Package,
  ShoppingCart,
  Users,
  FileText,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  Clock,
  AlertCircle,
  PieChart,
  ChevronDown,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Image from 'next/image';
import { useDashboard } from '@/contexts/DashboardContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import apiService from '@/services/api.service';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuItem {
  /** Translation key — resolved at render time via t() */
  nameKey: string;
  icon: React.ElementType;
  href?: string;
  badge?: boolean;
  children?: { nameKey: string; href: string; icon: React.ElementType }[];
}

const adminMenuItems: MenuItem[] = [
  { nameKey: 'dashboard',     icon: LayoutDashboard, href: '/admin/dashboard' },
  { nameKey: 'categories',    icon: FolderTree,       href: '/admin/categories' },
  { nameKey: 'subcategories', icon: Layers,           href: '/admin/subcategories' },
  { nameKey: 'products',      icon: Package,          href: '/admin/products' },
  { nameKey: 'orders',        icon: ShoppingCart,     href: '/admin/orders' },
  { nameKey: 'users',         icon: Users,            href: '/admin/users' },
  {
    nameKey: 'quotations',
    icon: FileText,
    children: [
      { nameKey: 'allQuotations',    href: '/admin/quotations',         icon: FileText },
      { nameKey: 'createQuotation',  href: '/admin/quotations/create',  icon: PlusCircle },
      { nameKey: 'draftQuotations',  href: '/admin/quotations/drafts',  icon: Clock },
      { nameKey: 'expired',          href: '/admin/quotations/expired', icon: AlertCircle },
      { nameKey: 'quotationReports', href: '/admin/quotations/reports', icon: PieChart },
    ],
  },
  { nameKey: 'reports',       icon: BarChart3, href: '/admin/reports' },
  { nameKey: 'notifications', icon: Bell,      href: '/admin/notifications', badge: true },
  { nameKey: 'settings',      icon: Settings,  href: '/admin/settings' },
];

export const AdminSidebar = () => {
  const { sidebarCollapsed: collapsed, toggleSidebar, isMobileOpen, setIsMobileOpen } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(
    pathname.includes('/admin/quotations') ? ['quotations'] : []
  );

  // Prefetch every sidebar route on mount so clicking any nav item is instant
  useEffect(() => {
    const routes: string[] = [];
    adminMenuItems.forEach(item => {
      if (item.href) routes.push(item.href);
      item.children?.forEach(c => routes.push(c.href));
    });
    routes.forEach(r => router.prefetch(r));
  }, [router]);

  const toggleExpanded = (nameKey: string) => {
    setExpandedMenus(prev =>
      prev.includes(nameKey) ? prev.filter(n => n !== nameKey) : [...prev, nameKey]
    );
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiService.get('/notifications/unread-count');
        if (response.data && typeof response.data.data === 'number') {
          setUnreadCount(response.data.data);
        }
      } catch {
        // silent fail
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (window.confirm(t('logoutConfirm'))) {
      await logout();
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white text-gray-700">
      {/* Logo Section */}
      <div className={cn('py-2 transition-all duration-300', collapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-6')}>
        {collapsed ? (
          <>
            <div className="flex items-center justify-center w-full">
              <Image
                src="/images/shielder collapsed image.png"
                alt="Shielder"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
            </div>
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-300"
            >
              {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between w-full">
              <Image
                src="/images/Shielder new logo.png"
                alt="Shielder"
                width={150}
                height={50}
                className="object-contain h-auto"
                priority
              />
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-300"
              >
                {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <div className="h-[1px] w-full bg-gray-200 mt-2" />
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto scrollbar-hide py-2 space-y-0.5 transition-all duration-300', collapsed ? 'px-2' : 'px-3')}>
        {adminMenuItems.map(item => {
          const label = t(item.nameKey);

          // Group with children (e.g. Quotations)
          if (item.children) {
            const isExpanded = expandedMenus.includes(item.nameKey);
            const isGroupActive = item.children.some(
              c => pathname === c.href || pathname.startsWith(c.href + '/')
            );
            return (
              <div key={item.nameKey}>
                <button
                  onClick={() => !collapsed && toggleExpanded(item.nameKey)}
                  className={cn(
                    'w-full flex items-center py-3 rounded-xl transition-all duration-200 group',
                    collapsed ? 'justify-center px-2' : 'px-3',
                    isGroupActive
                      ? 'bg-[#FF6B35] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  title={collapsed ? label : ''}
                  aria-expanded={isExpanded}
                >
                  <item.icon size={19} className={cn('shrink-0', isGroupActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                  <span className={cn(
                    'ms-3 text-sm font-semibold whitespace-nowrap flex-1 text-start transition-all duration-300',
                    collapsed ? 'opacity-0 invisible w-0 ms-0 overflow-hidden' : 'opacity-100 visible'
                  )}>
                    {label}
                  </span>
                  {!collapsed && (
                    <ChevronDown size={13} className={cn('text-gray-400 transition-transform duration-300', isExpanded ? 'rotate-180' : '')} />
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className={cn('ms-3 mt-0.5 space-y-0.5 ps-4', isRTL ? 'border-r border-gray-200' : 'border-l border-gray-200')}>
                    {item.children.map(child => {
                      const childLabel = t(child.nameKey);
                      const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'flex items-center py-2 px-3 rounded-lg text-xs transition-all duration-200',
                            isActive
                              ? 'bg-[#FF6B35]/10 text-[#FF6B35] font-semibold'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <child.icon size={13} className="me-2.5 shrink-0" />
                          <span>{childLabel}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular item
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setIsMobileOpen(false)}
              prefetch={true}
              className={cn(
                'flex items-center py-3 rounded-xl transition-all duration-200 group relative',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive
                  ? 'bg-[#FF6B35] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              title={collapsed ? label : ''}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                size={19}
                className={cn('shrink-0 transition-all', isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')}
              />
              <span className={cn(
                'ms-3 text-sm font-semibold whitespace-nowrap transition-all duration-300',
                collapsed ? 'opacity-0 invisible w-0 ms-0 overflow-hidden' : 'opacity-100 visible'
              )}>
                {label}
              </span>
              {/* Notification badge */}
              {item.badge && unreadCount > 0 && (
                <span className={cn(
                  'absolute bg-red-500 text-white text-[9px] font-black rounded-full transition-all duration-300',
                  collapsed ? 'top-1.5 end-1.5 w-2 h-2' : 'end-3 px-1.5 py-0.5 min-w-[18px] text-center'
                )}>
                  {collapsed ? '' : (unreadCount > 99 ? '99+' : unreadCount)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={cn('bg-gray-50 border-t border-gray-200 transition-all duration-300', collapsed ? 'px-2 pt-3 pb-3' : 'px-3 pt-3 pb-4')}>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group',
            collapsed ? 'justify-center px-2' : 'px-3'
          )}
          title={collapsed ? t('logout') : ''}
        >
          <LogOut size={19} className="shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          <span className={cn('ms-3 text-sm font-semibold transition-all duration-300', collapsed ? 'opacity-0 invisible w-0 ms-0 overflow-hidden' : 'opacity-100 visible')}>
            {t('logout')}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — start-0 = left in LTR, right in RTL */}
      <aside
        className={cn(
          'hidden lg:flex fixed start-0 top-0 h-screen z-50 flex-col transition-all duration-300 shadow-2xl',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Drawer — slides from start edge */}
      <div className={cn('lg:hidden fixed inset-0 z-[60] transition-all duration-300', isMobileOpen ? 'visible' : 'invisible')}>
        <div
          className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300', isMobileOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setIsMobileOpen(false)}
        />
        <aside
          className={cn(
            'absolute start-0 top-0 h-full w-[240px] shadow-2xl transition-transform duration-300 bg-white',
            isMobileOpen
              ? 'translate-x-0'
              : isRTL ? 'translate-x-full' : '-translate-x-full'
          )}
        >
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-6 end-4 text-gray-500 hover:text-gray-900 p-1.5"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
          {SidebarContent}
        </aside>
      </div>
    </>
  );
};
