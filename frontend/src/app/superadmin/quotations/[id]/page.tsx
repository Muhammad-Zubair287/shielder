'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Edit3, Send, CheckCircle2, XCircle,
    ArrowRightLeft, RotateCcw, Printer,
    Clock, Activity, Loader2
} from 'lucide-react';
import quotationService from '@/services/quotation.service';
import { format } from 'date-fns';
import SARSymbol from '@/components/SARSymbol';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    VIEWED: 'bg-purple-100 text-purple-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    CONVERTED: 'bg-teal-100 text-teal-700',
};

export default function ViewQuotationPage() {
    const { t, isRTL } = useLanguage();
    const { id } = useParams();
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [reactivateDate, setReactivateDate] = useState('');
    const [showReactivateModal, setShowReactivateModal] = useState(false);

    const getStatusLabel = (status: string) => {
        if (status === 'PENDING') return t('pendingCustomerSubmitted');
        return status;
    };

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getById(id as string);
            setQuotation(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchQuotation(); }, [id]);

    const handleAction = async (action: string) => {
        try {
            setActionLoading(action);
            if (action === 'send') await quotationService.send(id as string);
            else if (action === 'approve') await quotationService.approve(id as string);
            else if (action === 'reject') { await quotationService.reject(id as string, rejectReason); setShowRejectModal(false); }
            else if (action === 'convert') {
                const res = await quotationService.convertToOrder(id as string);
                alert(`✅ Order created! Order ID: ${res.data.data.order?.orderNumber || 'See Orders'}`);
            }
            else if (action === 'reactivate') { await quotationService.reactivate(id as string, reactivateDate); setShowReactivateModal(false); }
            fetchQuotation();
        } catch (e: any) { alert(e?.response?.data?.message || 'Action failed'); }
        finally { setActionLoading(''); }
    };

    const handlePrint = () => window.print();

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-shielder-primary" />
        </div>
    );
    if (!quotation) return <div className="text-center py-20 text-gray-400">Quotation not found.</div>;

    const isEditable = ['PENDING', 'DRAFT', 'SENT'].includes(quotation.status);
    const canSend = ['PENDING', 'DRAFT', 'SENT'].includes(quotation.status);
    const canApprove = ['SENT', 'VIEWED'].includes(quotation.status);
    const canReject = ['SENT', 'VIEWED', 'APPROVED'].includes(quotation.status);
    const canConvert = quotation.status === 'APPROVED' && !quotation.convertedOrderId;
    const canReactivate = quotation.status === 'EXPIRED';

    return (
        <div className="space-y-6 max-w-5xl mx-auto print:max-w-none" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/superadmin/quotations" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><ArrowLeft size={18} /></Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-shielder-dark">{quotation.quotationNumber}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${STATUS_COLORS[quotation.status]}`}>{getStatusLabel(quotation.status)}</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Created {format(new Date(quotation.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"><Printer size={15} />Print</button>
                    {isEditable && (
                        <Link href={`/superadmin/quotations/${id}/edit`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"><Edit3 size={15} />Edit</Link>
                    )}
                    {canSend && (
                        <button disabled={!!actionLoading} onClick={() => handleAction('send')} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"><Send size={15} />Send</button>
                    )}
                    {canApprove && (
                        <button disabled={!!actionLoading} onClick={() => handleAction('approve')} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors disabled:opacity-50"><CheckCircle2 size={15} />Approve</button>
                    )}
                    {canReject && (
                        <button onClick={() => setShowRejectModal(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"><XCircle size={15} />Reject</button>
                    )}
                    {canConvert && (
                        <button disabled={!!actionLoading} onClick={() => handleAction('convert')} className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-[#FF5722] transition-colors shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50">
                            {actionLoading === 'convert' ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
                            Convert to Order
                        </button>
                    )}
                    {canReactivate && (
                        <button onClick={() => setShowReactivateModal(true)} className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors"><RotateCcw size={15} />Reactivate</button>
                    )}
                </div>
            </div>

            {/* Converted Order Link */}
            {quotation.convertedOrder && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-teal-600" />
                    <p className="text-teal-700 text-sm font-bold">This quotation was converted to Order <Link href={`/superadmin/orders/${quotation.convertedOrder.id}`} className="underline">{quotation.convertedOrder.orderNumber}</Link></p>
                </div>
            )}

            {/* Quotation Document */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
                {/* Document Header */}
                <div className="bg-shielder-dark p-8 text-white print:p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black tracking-widest uppercase">SHIELDER</h2>
                            <p className="text-white/60 text-sm mt-1">Inventory Management System</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/60 text-xs uppercase font-bold tracking-widest">Quotation</p>
                            <p className="text-2xl font-black mt-1">{quotation.quotationNumber}</p>
                            <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${STATUS_COLORS[quotation.status]}`}>{getStatusLabel(quotation.status)}</span>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="p-8 print:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Bill To</p>
                            <p className="font-black text-shielder-dark text-lg">{quotation.customerName}</p>
                            {quotation.companyName && <p className="text-gray-500 text-sm">{quotation.companyName}</p>}
                            {quotation.customerEmail && <p className="text-gray-500 text-sm">{quotation.customerEmail}</p>}
                            {quotation.customerPhone && <p className="text-gray-500 text-sm">{quotation.customerPhone}</p>}
                            {quotation.customerAddress && <p className="text-gray-500 text-sm mt-1">{quotation.customerAddress}</p>}
                        </div>
                        <div className="space-y-2 md:text-right">
                            <div className="flex md:justify-end gap-6 text-sm">
                                <span className="text-gray-400 font-medium">Date:</span>
                                <span className="font-bold text-gray-700">{format(new Date(quotation.quotationDate || quotation.createdAt), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex md:justify-end gap-6 text-sm">
                                <span className="text-gray-400 font-medium">Expiry:</span>
                                <span className={`font-bold ${quotation.status === 'EXPIRED' ? 'text-red-500' : 'text-orange-500'}`}>{format(new Date(quotation.expiryDate), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex md:justify-end gap-6 text-sm">
                                <span className="text-gray-400 font-medium">Created By:</span>
                                <span className="font-bold text-gray-700">{quotation.createdBy?.profile?.fullName || quotation.createdBy?.email || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-y border-gray-100">
                                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">#</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Qty</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Unit Price</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Discount</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items?.map((item: any, idx: number) => (
                                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-700">{item.productName}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-gray-600"><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(item.unitPrice).toFixed(2)}</span></td>
                                        <td className="px-4 py-3 text-right text-green-600">-<span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(item.discount || 0).toFixed(2)}</span></td>
                                        <td className="px-4 py-3 text-right font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(item.totalPrice).toFixed(2)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-8">
                        <div className="w-72 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(quotation.subtotal).toFixed(2)}</span></div>
                            <div className="flex justify-between text-green-600"><span>Discount</span><span>-<span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(quotation.discount).toFixed(2)}</span></span></div>
                            <div className="flex justify-between text-gray-500"><span>Tax</span><span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(quotation.tax).toFixed(2)}</span></div>
                            <div className="flex justify-between font-black text-shielder-dark text-base border-t border-gray-200 pt-2">
                                <span>GRAND TOTAL</span>
                                <span className="text-shielder-primary text-xl inline-flex items-center gap-0.5"><SARSymbol />{Number(quotation.total).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quotation.notes && (
                            <div className="p-4 bg-orange-50 border-l-4 border-shielder-primary rounded-r-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Notes</p>
                                <p className="text-sm text-gray-600">{quotation.notes}</p>
                            </div>
                        )}
                        {quotation.terms && (
                            <div className="p-4 bg-blue-50 border-l-4 border-shielder-secondary rounded-r-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Terms & Conditions</p>
                                <p className="text-sm text-gray-600">{quotation.terms}</p>
                            </div>
                        )}
                    </div>

                    {/* Signature section */}
                    <div className="mt-12 grid grid-cols-2 gap-12 border-t border-gray-100 pt-8">
                        <div>
                            <div className="h-12 border-b-2 border-gray-200 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">Authorized Signature</p>
                        </div>
                        <div>
                            <div className="h-12 border-b-2 border-gray-200 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">Customer Acceptance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
                <h3 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-4 flex items-center gap-2"><Activity size={16} />Activity Timeline</h3>
                <div className="space-y-3">
                    {(quotation.activities || []).map((act: any) => (
                        <div key={act.id} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-shielder-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock size={12} className="text-shielder-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-700">{act.action.replace(/_/g, ' ')}</p>
                                {act.note && <p className="text-xs text-gray-400 mt-0.5">{act.note}</p>}
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(act.createdAt), 'MMM dd, HH:mm')}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="font-black text-shielder-dark mb-4 flex items-center gap-2"><XCircle size={18} className="text-red-500" />Reject Quotation</h3>
                        <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" rows={3} placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                            <button disabled={!!actionLoading} onClick={() => handleAction('reject')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                                {actionLoading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reactivate Modal */}
            {showReactivateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="font-black text-shielder-dark mb-4 flex items-center gap-2"><RotateCcw size={18} className="text-orange-500" />Reactivate Quotation</h3>
                        <p className="text-sm text-gray-500 mb-3">Set a new expiry date for this quotation:</p>
                        <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" value={reactivateDate} onChange={e => setReactivateDate(e.target.value)} />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowReactivateModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                            <button disabled={!!actionLoading || !reactivateDate} onClick={() => handleAction('reactivate')} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                                {actionLoading === 'reactivate' ? <Loader2 size={14} className="animate-spin" /> : 'Reactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
