'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, Eye, RotateCcw, Loader2, X } from 'lucide-react';
import quotationService from '@/services/quotation.service';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import SARSymbol from '@/components/SARSymbol';

export default function ExpiredQuotationsPage() {
    const { t, isRTL } = useLanguage();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [reactivateId, setReactivateId] = useState('');
    const [reactivateDate, setReactivateDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetch = useCallback(async () => {
        try {
            setLoading(true);
            const res = await quotationService.getAll({ status: 'EXPIRED', page, limit: 10 });
            setQuotations(res.data?.quotations || []);
            setPagination(res.data?.pagination || { total: 0, pages: 1 });
        } catch { setQuotations([]); } finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleReactivate = async () => {
        if (!reactivateDate) { alert('Select a new expiry date.'); return; }
        try {
            setSubmitting(true);
            await quotationService.reactivate(reactivateId, reactivateDate);
            setReactivateId(''); setReactivateDate('');
            fetch();
        } catch (e: any) { alert(e?.response?.data?.message || 'Failed'); }
        finally { setSubmitting(false); }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-4">
                <AlertCircle size={24} className="text-orange-500 shrink-0" />
                <div>
                    <p className="font-black text-orange-700">{t('expiredQuotationsTitle')}</p>
                    <p className="text-orange-600 text-sm">{t('expiredQuotationsSubtitle')}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {['Quotation #', 'Customer', 'Total', 'Expired On', 'Created By', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-8 bg-gray-50 rounded-lg animate-pulse" /></td></tr>)
                            ) : quotations.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">No expired quotations — great job! 🎉</td></tr>
                            ) : quotations.map((q: any) => (
                                <tr key={q.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="px-5 py-4 text-xs font-black text-shielder-dark">{q.quotationNumber}</td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs font-bold text-gray-700">{q.customerName}</p>
                                        <p className="text-xs text-gray-400">{q.customerEmail}</p>
                                    </td>
                                    <td className="px-5 py-4 text-xs font-black"><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                                    <td className="px-5 py-4 text-xs text-red-500 font-bold">{q.expiryDate ? format(new Date(q.expiryDate), 'MMM dd, yyyy') : '—'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-400">{q.createdBy?.profile?.fullName || q.createdBy?.email || '—'}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1">
                                            <Link href={`/superadmin/quotations/${q.id}`} className="p-1.5 text-gray-400 hover:text-shielder-secondary hover:bg-shielder-secondary/5 rounded-lg transition-all"><Eye size={15} /></Link>
                                            <button onClick={() => setReactivateId(q.id)} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors">
                                                <RotateCcw size={12} />Reactivate
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <UnifiedPagination
                    page={page}
                    totalPages={pagination.pages || 1}
                    totalItems={pagination.total}
                    pageSize={10}
                    onPageChange={setPage}
                    isRTL={isRTL}
                />
            </div>

            {/* Reactivate Modal */}
            {reactivateId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-shielder-dark flex items-center gap-2"><RotateCcw size={18} className="text-orange-500" />Reactivate</h3>
                            <button onClick={() => setReactivateId('')} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Set a new expiry date:</p>
                        <input type="date" min={today} value={reactivateDate} onChange={e => setReactivateDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setReactivateId('')} className="flex-1 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl">Cancel</button>
                            <button disabled={submitting || !reactivateDate} onClick={handleReactivate} className="flex-1 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
