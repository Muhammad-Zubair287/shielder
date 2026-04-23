'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Eye, Edit3, Send, Plus } from 'lucide-react';
import quotationService from '@/services/quotation.service';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import SARSymbol from '@/components/SARSymbol';

export default function DraftQuotationsPage() {
    const { t, isRTL } = useLanguage();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [sendingId, setSendingId] = useState('');

    const fetch = useCallback(async () => {
        try {
            setLoading(true);
            const res = await quotationService.getAll({ status: 'DRAFT', page, limit: 10 });
            setQuotations(res.data?.quotations || []);
            setPagination(res.data?.pagination || { total: 0, pages: 1 });
        } catch { setQuotations([]); } finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleSend = async (id: string) => {
        const adminReply = window.prompt('Optional admin reply for customer:') || undefined;
        try { setSendingId(id); await quotationService.send(id, adminReply); fetch(); }
        catch (e: any) { alert(e?.response?.data?.message || 'Failed'); }
        finally { setSendingId(''); }
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('draftQuotationsTitle')}</h1>
                    <p className="text-gray-500 text-sm">{t('draftQuotationsSubtitle')}</p>
                </div>
                <Link href="/superadmin/quotations/create" className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF6B35]/20 hover:bg-[#FF5722] transition-colors">
                    <Plus size={16} />New Quotation
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {['Quotation #', 'Customer', 'Total', 'Items', 'Expiry', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-8 bg-gray-50 rounded-lg animate-pulse" /></td></tr>)
                            ) : quotations.length === 0 ? (
                                <tr><td colSpan={7} className="px-5 py-16 text-center">
                                    <FileText size={36} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-400 text-sm">No draft quotations</p>
                                    <Link href="/superadmin/quotations/create" className="text-shielder-primary text-sm font-bold hover:underline mt-2 block">Create one →</Link>
                                </td></tr>
                            ) : quotations.map((q: any) => (
                                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4 text-xs font-black text-shielder-dark">{q.quotationNumber}</td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs font-bold text-gray-700">{q.customerName}</p>
                                        <p className="text-xs text-gray-400">{q.customerEmail}</p>
                                    </td>
                                    <td className="px-5 py-4 text-xs font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                                    <td className="px-5 py-4 text-xs text-gray-500">{q._count?.items || 0} items</td>
                                    <td className="px-5 py-4 text-xs text-orange-500 font-bold">{q.expiryDate ? format(new Date(q.expiryDate), 'MMM dd, yyyy') : '—'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-400">{format(new Date(q.createdAt), 'MMM dd, yyyy')}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1">
                                            <Link href={`/superadmin/quotations/${q.id}`} className="p-1.5 text-gray-400 hover:text-shielder-secondary hover:bg-shielder-secondary/5 rounded-lg transition-all"><Eye size={15} /></Link>
                                            <Link href={`/superadmin/quotations/${q.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 size={15} /></Link>
                                            <button disabled={sendingId === q.id} onClick={() => handleSend(q.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30"><Send size={15} /></button>
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
        </div>
    );
}
