'use client';

import React, { useState, useEffect } from 'react';
import { Bell, User, Search, Globe, ChevronDown } from 'lucide-react';
import adminService from '@/services/admin.service';

export const Navbar = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await adminService.getLowStockCount();
        // Just as an example, we could also fetch actual unread notification count
        // setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to fetch unread count');
      }
    };
    fetchUnread();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
      {/* Search Bar */}
      <div className="relative w-96 max-w-lg hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search products, orders, users..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-shielder-primary transition-all text-sm"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-6">
        {/* Language Switcher */}
        <button className="flex items-center space-x-1 text-gray-600 hover:text-shielder-primary transition-colors">
          <Globe size={20} />
          <span className="text-sm font-medium">EN</span>
          <ChevronDown size={14} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-shielder-critical text-white text-[10px] font-bold px-1 min-w-[18px] rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 cursor-pointer group hover:bg-gray-50 p-1 px-2 rounded-lg transition-all">
          <div className="flex flex-col items-end mr-1">
            <span className="text-sm font-semibold text-gray-800">Super Admin</span>
            <span className="text-xs text-gray-500 font-medium">Full Access</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-shielder-primary flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-all">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};
