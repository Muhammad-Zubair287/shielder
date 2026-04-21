'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Layers,
  Users,
  Bell,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  FolderTree,
  Package,
  ShoppingCart,
  Wallet,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ChevronDown,
  PlusCircle,
  Clock,
  AlertCircle,
  PieChart
} from 'lucide-react';
import Image from 'next/image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboard } from '@/contexts/DashboardContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import apiService from '@/services/api.service';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuItem {
  nameKey: string;
  icon: React.ElementType;
  href?: string;
  badge?: boolean;
  children?: { nameKey: string; href: string; icon: React.ElementType }[];
}

const superAdminMenuItems: MenuItem[] = [
  { nameKey: 'dashboard',      icon: LayoutDashboard, href: '/superadmin/dashboard' },
  { nameKey: 'admins',         icon: ShieldCheck,     href: '/superadmin/admins' },
  { nameKey: 'categories',     icon: FolderTree,      href: '/superadmin/categories' },
  { nameKey: 'subcategories',  icon: Layers,          href: '/superadmin/subcategories' },
  { nameKey: 'products',       icon: Package,         href: '/superadmin/products' },
  { nameKey: 'orders',         icon: ShoppingCart,    href: '/superadmin/orders' },
  { nameKey: 'users',          icon: Users,           href: '/superadmin/users' },
  { nameKey: 'payments',       icon: Wallet,          href: '/superadmin/payments' },
  {
    nameKey: 'quotations',
    icon: FileText,
    children: [
      { nameKey: 'allQuotations',    href: '/superadmin/quotations',         icon: FileText },
      { nameKey: 'createQuotation',  href: '/superadmin/quotations/create',  icon: PlusCircle },
      { nameKey: 'draftQuotations',  href: '/superadmin/quotations/drafts',  icon: Clock },
      { nameKey: 'expired',          href: '/superadmin/quotations/expired', icon: AlertCircle },
      { nameKey: 'quotationReports', href: '/superadmin/quotations/reports', icon: PieChart },
    ]
  },
  { nameKey: 'reports',        icon: BarChart3, href: '/superadmin/reports' },
  { nameKey: 'notifications',  icon: Bell,      href: '/superadmin/notifications', badge: true },
  { nameKey: 'settings',       icon: Settings,  href: '/superadmin/settings' },
];

export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, toggleSidebar, isMobileOpen, setIsMobileOpen } = useDashboard();
  const { t, isRTL } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const prefetchedRoutes = useRef(new Set<string>());
  const [expandedMenus, setExpandedMenus] = useState<string[]>(
    // Auto-expand if a quotation path is active
    pathname.includes('/superadmin/quotations') ? ['quotations'] : []
  );

  const menuItems = superAdminMenuItems;

  const prefetchRoute = (href: string) => {
    if (prefetchedRoutes.current.has(href)) return;
    prefetchedRoutes.current.add(href);
    router.prefetch(href);
  };

  const prefetchRoutes = (routes: string[]) => {
    routes.forEach(prefetchRoute);
  };

  // Warm the visible top-level routes after the initial paint.
  useEffect(() => {
    const routes: string[] = [...new Set(superAdminMenuItems.flatMap(item => item.href ? [item.href] : []))];
    const timer = window.setTimeout(() => prefetchRoutes(routes), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleExpanded = (nameKey: string) => {
    if (nameKey === 'quotations') {
      prefetchRoutes(superAdminMenuItems.find(item => item.nameKey === 'quotations')?.children?.map(child => child.href) ?? []);
    }
    setExpandedMenus(prev =>
      prev.includes(nameKey) ? prev.filter(n => n !== nameKey) : [...prev, nameKey]
    );
  };

  // Re-check unread notifications periodically or on mount
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      const fetchNotifications = async () => {
        try {
          const response = await apiService.get('/notifications/unread-count');
          if (response.data && typeof response.data.data === 'number') {
            setUnreadCount(response.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch notifications', error);
        }
      };
      
      const timer = window.setTimeout(fetchNotifications, 600);
      
      // Then refresh every 30 seconds (reduced frequency)
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [user]);

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') return null;

  const handleLogout = async () => {
    if (window.confirm(t('logoutConfirm'))) {
      await logout();
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full text-gray-700 dark:text-slate-200">
      {/* Logo Section */}
      <div className={cn(
        "py-2 transition-all duration-300",
        collapsed ? "px-2 flex flex-col items-center gap-2" : "px-6"
      )}>
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
              className="hidden lg:flex p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 transition-all duration-300"
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
                className="object-contain h-auto w-auto"
                priority
              />
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 transition-all duration-300"
              >
                {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <div className="h-[1px] w-full bg-gray-200 dark:bg-slate-800 mt-2" />
          </>
        )}
      </div>

      {/* Navigation Items */}
      <nav className={cn(
        "flex-1 overflow-y-auto scrollbar-hide py-2 space-y-0.5 transition-all duration-300",
        collapsed ? "px-2" : "px-3"
      )}>
        {menuItems.map((item) => {
          // Group item with children
          if (item.children) {
            const isExpanded = expandedMenus.includes(item.nameKey);
            const isGroupActive = item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
            const label = t(item.nameKey);
            return (
              <div key={item.nameKey}>
                <button
                  onClick={() => !collapsed && toggleExpanded(item.nameKey)}
                  onMouseEnter={() => item.children?.forEach(child => prefetchRoute(child.href))}
                  onFocus={() => item.children?.forEach(child => prefetchRoute(child.href))}
                  className={cn(
                    'w-full flex items-center py-3 rounded-xl transition-all duration-200 group relative',
                    collapsed ? 'justify-center px-2' : 'px-3',
                    isGroupActive
                      ? 'bg-[#FF6B35] text-white shadow-md'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-slate-100'
                  )}
                  title={collapsed ? label : ''}
                >
                  <item.icon
                    size={19}
                    className={cn('shrink-0', isGroupActive ? 'text-white' : 'text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-slate-100')}
                  />
                  <span className={cn(
                    'ms-3 text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-1 text-start',
                    collapsed ? 'opacity-0 invisible w-0 ms-0 overflow-hidden' : 'opacity-100 visible w-auto'
                  )}>
                    {label}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      size={13}
                      className={cn('transition-transform duration-300', isExpanded ? 'rotate-180' : '')}
                    />
                  )}
                </button>
                {/* Sub-items */}
                {isExpanded && !collapsed && (
                  <div className={cn('ms-3 mt-0.5 space-y-0.5 ps-4', isRTL ? 'border-r border-gray-200 dark:border-slate-800' : 'border-l border-gray-200 dark:border-slate-800')}>
                    {(() => {
                      const activeChild = item.children
                        .filter(child => pathname === child.href || pathname.startsWith(child.href + '/'))
                        .sort((a, b) => b.href.length - a.href.length)[0];

                      return item.children.map(child => {
                        const childLabel = t(child.nameKey);
                        const isChildActive = activeChild?.href === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsMobileOpen(false)}
                            onMouseEnter={() => prefetchRoute(child.href)}
                            onFocus={() => prefetchRoute(child.href)}
                            className={cn(
                              'flex items-center py-2 px-3 rounded-lg text-xs transition-all duration-200 group',
                              isChildActive
                                ? 'bg-[#FF6B35]/12 text-[#FF6B35] font-semibold'
                                : 'text-gray-500 dark:text-slate-400 hover:bg-[#FF6B35]/10 hover:text-[#FF6B35]'
                            )}
                          >
                            <child.icon
                              size={13}
                              className={cn(
                                'me-2.5 shrink-0 transition-colors',
                                isChildActive
                                  ? 'text-[#FF6B35]'
                                  : 'text-gray-400 dark:text-slate-500 group-hover:text-[#FF6B35]'
                              )}
                            />
                            <span className="whitespace-nowrap">{childLabel}</span>
                          </Link>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          }

          // Regular item
          const isActive = pathname === item.href;
          const label = t(item.nameKey);
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setIsMobileOpen(false)}
              onMouseEnter={() => item.href && prefetchRoute(item.href)}
              onFocus={() => item.href && prefetchRoute(item.href)}
              className={cn(
                'flex items-center py-3 rounded-xl transition-all duration-200 group relative',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive
                  ? 'bg-[#FF6B35] text-white shadow-md'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-slate-100'
              )}
              title={collapsed ? label : ''}
            >
              <item.icon
                size={19}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-slate-100'
                )}
              />
              <span className={cn(
                'ms-3 text-sm font-semibold transition-all duration-300 whitespace-nowrap',
                collapsed ? 'opacity-0 invisible w-0 ms-0 overflow-hidden' : 'opacity-100 visible w-auto'
              )}>
                {label}
              </span>

              {item.badge && unreadCount > 0 && (
                <span className={cn(
                  'absolute bg-red-500 text-white text-[10px] font-bold rounded-full text-center transition-all duration-300',
                  collapsed
                    ? 'top-2 end-2 w-2 h-2 p-0'
                    : 'end-4 px-1.5 py-0.5 min-w-[20px]'
                )}>
                  {collapsed ? '' : (unreadCount > 99 ? '99+' : unreadCount)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className={cn(
        "p-4 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-200 dark:border-slate-800 transition-all duration-300",
        collapsed ? "p-2" : "p-4"
      )}>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center rounded-lg text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/35 hover:text-red-600 transition-all duration-300 group",
            collapsed ? "justify-center px-0 py-3" : "px-4 py-3"
          )}
          title={collapsed ? t('logout') : ""}
        >
          <LogOut size={20} className={cn("transition-transform", isRTL ? "group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
          <span className={cn(
            "ms-4 font-medium transition-all duration-300",
            collapsed ? "opacity-0 invisible w-0 ms-0" : "opacity-100 visible w-auto"
          )}>
            {t('logout')}
          </span>
        </button>
      </div>
    </div>
  );
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-0 h-screen bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 z-50 flex-col shadow-[2px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)] transition-all duration-300 border-r border-gray-100 dark:border-slate-800",
          isRTL ? "right-0 border-l border-r-0 shadow-[-2px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)]" : "left-0",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <div className={cn(
        "lg:hidden fixed inset-0 z-[60] transition-visibility duration-300",
        isMobileOpen ? "visible" : "invisible"
      )}>
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Drawer */}
        <aside
          className={cn(
            "absolute top-0 h-full w-[260px] bg-white dark:bg-slate-950 shadow-2xl transition-transform duration-300 border-r border-gray-100 dark:border-slate-800",
            isRTL
              ? cn("right-0 border-l border-r-0", isMobileOpen ? "translate-x-0" : "translate-x-full")
              : cn("left-0", isMobileOpen ? "translate-x-0" : "-translate-x-full")
          )}
        >
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-8 right-4 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:rotate-90 transition-transform p-2"
          >
            <X size={24} />
          </button>
          {SidebarContent}
        </aside>
      </div>
    </>
  );
};
