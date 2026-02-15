'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Box, 
  Layers, 
  Users, 
  Bell, 
  AlertTriangle, 
  CheckSquare,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/admin' },
  { name: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { name: 'Approvals', icon: CheckSquare, href: '/admin/approvals' },
  { name: 'Categories', icon: Layers, href: '/admin/categories' },
  { name: 'Low Stock', icon: AlertTriangle, href: '/admin/low-stock', badge: true },
  { name: 'User Management', icon: Users, href: '/admin/users' },
];

import { useDashboard } from '@/contexts/DashboardContext';

export const Sidebar = () => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useDashboard();
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-shielder-dark text-white transition-all duration-300 z-50 flex flex-col shadow-xl",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <span className="text-2xl font-bold tracking-tight text-white uppercase italic">
            Shielder<span className="text-shielder-primary">.Admin</span>
          </span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-shielder-primary transition-colors hover:text-white text-gray-400"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center p-3 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-shielder-primary text-white shadow-lg" 
                  : "text-gray-400 hover:bg-shielder-secondary hover:text-white"
              )}
            >
              <item.icon size={22} className={cn("min-w-[22px]", isActive ? "text-white" : "group-hover:text-white")} />
              {!collapsed && (
                <span className="ml-4 font-medium transition-opacity duration-300 whitespace-nowrap">
                  {item.name}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-shielder-dark text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <Link
          href="/admin/settings"
          className={cn(
            "flex items-center p-3 rounded-lg text-gray-400 hover:bg-shielder-primary hover:text-white transition-all",
            collapsed ? "justify-center" : ""
          )}
        >
          <Settings size={22} />
          {!collapsed && <span className="ml-4 font-medium">Settings</span>}
        </Link>
        <button
          className={cn(
            "w-full flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut size={22} />
          {!collapsed && <span className="ml-4 font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
