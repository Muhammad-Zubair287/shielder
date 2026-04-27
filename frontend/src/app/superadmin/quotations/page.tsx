'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Plus, Eye, Edit3, Trash2, RefreshCcw,
    CheckCircle2, XCircle, FileText,
    Send, ArrowRightLeft
} from 'lucide-react';
import quotationService from '@/services/quotation.service';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import SARSymbol from '@/components/SARSymbol';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SENT: 'bg-blue-100 text-blue-700 border-blue-200',
    VIEWED: 'bg-purple-100 text-purple-700 border-purple-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    EXPIRED: 'bg-orange-100 text-orange-700 border-orange-200',
    CONVERTED: 'bg-teal-100 text-teal-700 border-teal-200',
};

export default function AllQuotationsPage() {
    const { t, isRTL } = useLanguage();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ search: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' });

    const fetchQuotations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await quotationService.getAll({ page: pagination.page, limit: pagination.limit, ...filters });
            setQuotations(res.data?.quotations || []);
            setPagination(prev => ({ ...prev, ...(res.data?.pagination || {}) }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    const fetchAnalytics = async () => {
        try {
            const res = await quotationService.getAnalytics();
            setSummary(res.data || {});
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchQuotations(); fetchAnalytics(); }, [fetchQuotations]);

    // Reset pagination when filters change
    useEffect(() => {
        setPagination((p) => ({ ...p, page: 1 }));
    }, [filters.search, filters.status, filters.sortBy, filters.sortOrder]);

    const handleAction = async (action: string, id: string) => {
        try {
            setActionLoading(id + action);
            if (action === 'send') await quotationService.send(id);
            else if (action === 'approve') await quotationService.approve(id);
            else if (action === 'convert') await quotationService.convertToOrder(id);
            else if (action === 'delete') {
                if (!confirm('Delete this quotation? This cannot be undone.')) return;
                await quotationService.delete(id);
            }
            fetchQuotations(); fetchAnalytics();
        } catch (e: any) { alert(e?.response?.data?.message || 'Action failed'); }
        finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('quotationMgmtTitle')}</h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">{t('quotationMgmtSubtitle')}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => { fetchQuotations(); fetchAnalytics(); }} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                        <RefreshCcw size={18} />
                    </button>
                    <Link href="/superadmin/quotations/create" className="flex items-center space-x-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl hover:bg-[#FF5722] transition-colors font-bold text-sm shadow-lg shadow-[#FF6B35]/20">
                        <Plus size={18} />
                        <span>{t('createQuotation')}</span>
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label={t('total')} value={summary.total || 0} icon={<FileText size={20} />} color="bg-shielder-dark" />
                <StatCard label={t('approved')} value={summary.approved || 0} icon={<CheckCircle2 size={20} />} color="bg-green-500" />
                <StatCard label={t('converted')} value={summary.converted || 0} icon={<ArrowRightLeft size={20} />} color="bg-teal-500" />
                <StatCard label={t('expired')} value={summary.expired || 0} icon={<XCircle size={20} />} color="bg-orange-500" />
            </div>

            {/* Conversion Rate Banner */}
            {summary.conversionRate && (
                <div className="bg-gradient-to-r from-shielder-dark to-shielder-secondary p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{t('conversionRate')}</p>
                        <p className="text-white text-3xl font-black">{summary.conversionRate}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{t('revenueFromConverted')}</p>
                        <p className="text-shielder-primary text-2xl font-black inline-flex items-center gap-0.5"><SARSymbol />{Number(summary.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder={t('searchOrders')} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
                </div>
                <select className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                    <option value="">{t('allStatuses')}</option>
                    {['PENDING', 'DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED'].map(s => (
                        <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {[t('quotationNumber'), t('customer'), t('emailAddress'), t('orderTotal'), t('status'), t('expiryCol'), t('createdByCol'), t('quotationDate'), t('actions')].map(h => (
                                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={9} className="px-5 py-4"><div className="h-10 bg-gray-50 rounded-lg w-full" /></td></tr>)
                            ) : quotations.length === 0 ? (
                                <tr><td colSpan={9} className="px-5 py-16 text-center"><div className="flex flex-col items-center gap-3"><FileText size={40} className="text-gray-200" /><p className="text-gray-400 font-medium">{t('noQuotations')}</p><Link href="/superadmin/quotations/create" className="text-shielder-primary text-sm font-bold hover:underline">{t('createFirstQuotation')} →</Link></div></td></tr>
                            ) : quotations.map((q: any) => (
                                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className="text-xs font-black text-shielder-dark">{q.quotationNumber}</span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 rounded-lg bg-shielder-dark/5 flex items-center justify-center text-shielder-dark text-[11px] font-black shrink-0">
                                                {q.customerName?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{q.customerName}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">{q.customerEmail}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-xs font-black text-shielder-dark">
                                        <span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${STATUS_COLORS[q.status] || ''}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {q.expiryDate ? format(new Date(q.expiryDate), 'MMM dd, yyyy') : '—'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {q.createdBy?.profile?.fullName || q.createdBy?.email || '—'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400">
                                        {format(new Date(q.createdAt), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-1">
                                            <Link href={`/superadmin/quotations/${q.id}`} className="p-1.5 text-gray-400 hover:text-shielder-secondary hover:bg-shielder-secondary/5 rounded-lg transition-all" title="View">
                                                <Eye size={15} />
                                            </Link>
                                            {['PENDING', 'DRAFT', 'SENT'].includes(q.status) && (
                                                <Link href={`/superadmin/quotations/${q.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                    <Edit3 size={15} />
                                                </Link>
                                            )}
                                            {['PENDING', 'DRAFT', 'SENT'].includes(q.status) && (
                                                <button disabled={!!actionLoading} onClick={() => handleAction('send', q.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Send">
                                                    <Send size={15} />
                                                </button>
                                            )}
                                            {['SENT', 'VIEWED'].includes(q.status) && (
                                                <button disabled={!!actionLoading} onClick={() => handleAction('approve', q.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Approve">
                                                    <CheckCircle2 size={15} />
                                                </button>
                                            )}
                                            {q.status === 'APPROVED' && (
                                                <button disabled={!!actionLoading} onClick={() => handleAction('convert', q.id)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Convert to Order">
                                                    <ArrowRightLeft size={15} />
                                                </button>
                                            )}
                                            <button disabled={!!actionLoading} onClick={() => handleAction('delete', q.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <UnifiedPagination
                    page={pagination.page}
                    totalPages={pagination.pages || 1}
                    totalItems={pagination.total}
                    pageSize={pagination.limit}
                    onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
                    isRTL={isRTL}
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: any) {
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-shielder-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>{icon}</div>
            </div>
            <div>
                <p className="text-2xl font-black text-shielder-dark tracking-tighter">{(value || 0).toLocaleString()}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
            </div>
        </div>
    );
}
