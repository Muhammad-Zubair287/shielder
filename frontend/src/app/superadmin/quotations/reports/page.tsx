'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, FileText, CheckCircle2, XCircle, ArrowRightLeft, Banknote, RefreshCcw } from 'lucide-react';
import quotationService from '@/services/quotation.service';
import { useLanguage } from '@/contexts/LanguageContext';
import FixedSARMark from '@/components/FixedSARMark';

export default function QuotationReportsPage() {
    const { t, isRTL } = useLanguage();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getAnalytics();
            setAnalytics(res.data.data);
        } catch { console.error('Failed to load analytics'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const formatSAR = (value: number) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

    const cards = analytics ? [
        { label: 'Total Quotations', value: analytics.total, icon: <FileText size={20} />, color: 'bg-shielder-dark', sub: 'All time' },
        { label: 'Approved', value: analytics.approved, icon: <CheckCircle2 size={20} />, color: 'bg-green-500', sub: `${analytics.draft || 0} draft` },
        { label: 'Rejected', value: analytics.rejected, icon: <XCircle size={20} />, color: 'bg-red-500', sub: `${analytics.expired || 0} expired` },
        { label: 'Converted to Orders', value: analytics.converted, icon: <ArrowRightLeft size={20} />, color: 'bg-teal-500', sub: `${analytics.conversionRate}% rate` },
        {
            label: 'Revenue from Converted',
            value: <span className="inline-flex items-center gap-1"><FixedSARMark />{formatSAR(analytics.revenue || 0)}</span>,
            icon: <Banknote size={20} />,
            color: 'bg-shielder-primary',
            sub: 'Total converted value',
        },
    ] : [];

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('quotationReportsTitle')}</h1>
                    <p className="text-gray-500 text-sm">{t('quotationReportsSubtitle')}</p>
                </div>
                <button onClick={fetch} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"><RefreshCcw size={18} /></button>
            </div>

            {/* KPI Cards */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {cards.map((c, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-shielder-primary/30 transition-all">
                            <div className={`w-10 h-10 ${c.color} text-white rounded-xl flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform`}>{c.icon}</div>
                            <p className="text-xl font-black text-shielder-dark tracking-tighter">{c.value}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{c.label}</p>
                            <p className="text-xs text-gray-300 mt-0.5">{c.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Conversion Rate Banner */}
            {analytics && (
                <div className="bg-gradient-to-r from-shielder-dark to-shielder-secondary p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-shielder-primary/20 rounded-full flex items-center justify-center">
                            <TrendingUp size={28} className="text-shielder-primary" />
                        </div>
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Overall Conversion Rate</p>
                            <p className="text-white text-4xl font-black">{analytics.conversionRate}%</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div><p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Sent</p><p className="text-white text-2xl font-black">{analytics.sent}</p></div>
                        <div><p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Viewed</p><p className="text-white text-2xl font-black">{analytics.viewed}</p></div>
                        <div><p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Expired</p><p className="text-2xl font-black text-orange-400">{analytics.expired}</p></div>
                    </div>
                </div>
            )}

            {/* Charts */}
            {analytics?.monthly && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quotations by Month */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5">Quotations Created (Last 6 Months)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={analytics.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                                <Bar dataKey="quotations" fill="#0A1E36" radius={[6, 6, 0, 0]} name="Quotations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue by Month */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5">Converted Revenue (Last 6 Months)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={analytics.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${Number(v || 0).toLocaleString()} SAR`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                                    formatter={(v: any) => [
                                        <span key="sar-value" className="inline-flex items-center gap-1"><FixedSARMark />{formatSAR(Number(v || 0))}</span>,
                                        'Revenue',
                                    ]}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#F97216" strokeWidth={3} dot={{ fill: '#F97216', r: 5 }} activeDot={{ r: 7 }} name="Revenue" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Status Breakdown */}
            {analytics && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-5">Status Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Draft', value: analytics.draft, color: 'bg-gray-100 text-gray-700' },
                            { label: 'Sent', value: analytics.sent, color: 'bg-blue-100 text-blue-700' },
                            { label: 'Viewed', value: analytics.viewed, color: 'bg-purple-100 text-purple-700' },
                            { label: 'Approved', value: analytics.approved, color: 'bg-green-100 text-green-700' },
                            { label: 'Rejected', value: analytics.rejected, color: 'bg-red-100 text-red-700' },
                            { label: 'Expired', value: analytics.expired, color: 'bg-orange-100 text-orange-700' },
                            { label: 'Converted', value: analytics.converted, color: 'bg-teal-100 text-teal-700' },
                        ].map(s => (
                            <div key={s.label} className={`p-4 rounded-xl ${s.color}`}>
                                <p className="text-2xl font-black">{s.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
