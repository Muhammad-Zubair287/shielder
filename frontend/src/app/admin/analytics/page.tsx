'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Download, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import adminService from '@/services/admin.service';

const COLORS = ['#045870', '#0205A6', '#10B981', '#F59E0B', '#EF4444'];

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking data for analytics specifically
    setRevenueData([
      { name: 'Week 1', revenue: 45000, orders: 120 },
      { name: 'Week 2', revenue: 52000, orders: 145 },
      { name: 'Week 3', revenue: 48000, orders: 132 },
      { name: 'Week 4', revenue: 61000, orders: 156 },
    ] as any);

    setCategoryData([
      { name: 'Excavators', value: 400 },
      { name: 'Bulldozers', value: 300 },
      { name: 'Cranes', value: 200 },
      { name: 'Loaders', value: 150 },
    ] as any);

    setUserGrowth([
      { name: 'Jan', count: 120 },
      { name: 'Feb', count: 210 },
      { name: 'Mar', count: 320 },
      { name: 'Apr', count: 480 },
      { name: 'May', count: 650 },
      { name: 'Jun', count: 890 },
    ] as any);

    setLoading(false);
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Detailed insights into Shielder market performance.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all text-sm">
            <Calendar size={18} className="mr-2 text-shielder-primary" /> Last 30 Days
          </button>
          <button className="flex items-center px-4 py-2 bg-shielder-primary text-white rounded-xl font-bold hover:bg-shielder-secondary transition-all shadow-lg shadow-shielder-primary/20 text-sm">
            <Download size={18} className="mr-2" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Revenue Growth</h3>
              <div className="flex items-center text-green-600 text-sm font-bold mt-1">
                <TrendingUp size={16} className="mr-1" /> +15.5% from last period
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#045870" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#045870" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#045870" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Market Share */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-8">Category Share</h3>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800">1,050</span>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Total Units</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {categoryData.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-gray-600">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
                <span className="text-sm font-bold text-gray-800">{((entry.value / 1050) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Growth Bar Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-8">User Acquisition</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#0205A6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
