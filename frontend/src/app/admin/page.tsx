'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Box, 
  Layers, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import adminService from '@/services/admin.service';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all duration-300"
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span className="ml-1">{trendValue}%</span>
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-gray-800 mt-1">{value}</h3>
    </div>
  </motion.div>
);

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Mocking responses for now if backend isn't ready
        const [overviewRes, revenueRes] = await Promise.all([
          adminService.getOverview(),
          adminService.getMonthlyRevenue()
        ]);
        
        setStats(overviewRes.data.data);
        setRevenueData(revenueRes.data.data);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
        // Fallback mock data
        setStats({
          totalUsers: '1,248',
          totalProducts: '482',
          totalCategories: '24',
          totalRevenue: '850,240',
          lowStockCount: '12'
        });
        setRevenueData([
          { month: 'Jan', amount: 45000 },
          { month: 'Feb', amount: 52000 },
          { month: 'Mar', amount: 48000 },
          { month: 'Apr', amount: 61000 },
          { month: 'May', amount: 55000 },
          { month: 'Jun', amount: 67000 },
        ] as any);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-shielder-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1 font-medium italic">Welcome back! Here's what's happening with Shielder today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers} 
          icon={Users} 
          trend="up" 
          trendValue="12"
          color="bg-shielder-primary" 
        />
        <StatCard 
          title="Products" 
          value={stats?.totalProducts} 
          icon={Box} 
          trend="up" 
          trendValue="8"
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Categories" 
          value={stats?.totalCategories} 
          icon={Layers} 
          color="bg-shielder-secondary" 
        />
        <StatCard 
          title="Revenue (SAR)" 
          value={stats?.totalRevenue} 
          icon={DollarSign} 
          trend="up" 
          trendValue="15"
          color="bg-green-500" 
        />
        <StatCard 
          title="Low Stock" 
          value={stats?.lowStockCount} 
          icon={AlertTriangle} 
          color="bg-shielder-critical" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Revenue Performance</h3>
            <span className="text-sm text-shielder-primary font-semibold flex items-center cursor-pointer hover:underline">
              View Report <ArrowUpRight size={16} className="ml-1" />
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#045870" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#045870" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#045870" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Recent Notifications</h3>
            <span className="text-sm text-shielder-primary font-semibold cursor-pointer hover:underline">See All</span>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className={`p-2 rounded-lg ${i % 2 === 0 ? 'bg-shielder-critical/10 text-shielder-critical' : 'bg-shielder-warning/10 text-shielder-warning'}`}>
                  {i % 2 === 0 ? <AlertTriangle size={20} /> : <TrendingUp size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-shielder-primary transition-colors line-clamp-1">
                    {i % 2 === 0 ? 'Critical Stock Level: Cat D9 Dozer' : 'New Supplier Registered: Al-Rashed Heavy Equipment'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
