'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Send, Trash2, Search, Loader2 } from 'lucide-react';
import quotationService from '@/services/quotation.service';

interface CartItem {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    totalPrice: number;
}

export default function EditQuotationPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quotation, setQuotation] = useState<any>(null);

    // Customer
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [companyName, setCompanyName] = useState('');

    // Products
    const [items, setItems] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);

    // Settings
    const [expiryDate, setExpiryDate] = useState('');
    const [taxRate, setTaxRate] = useState(10);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await quotationService.getById(id as string);
                const q = res.data.data;
                setQuotation(q);
                setCustomerName(q.customerName || '');
                setCustomerEmail(q.customerEmail || '');
                setCustomerPhone(q.customerPhone || '');
                setCustomerAddress(q.customerAddress || '');
                setCompanyName(q.companyName || '');
                setExpiryDate(q.expiryDate ? q.expiryDate.split('T')[0] : '');
                setNotes(q.notes || '');
                setTerms(q.terms || '');
                setOverallDiscount(Number(q.discount || 0));
                setItems((q.items || []).map((item: any) => ({
                    productId: item.productId,
                    productName: item.productName,
                    unitPrice: Number(item.unitPrice),
                    quantity: item.quantity,
                    discount: Number(item.discount || 0),
                    totalPrice: Number(item.totalPrice)
                })));
            } catch { router.push('/admin/quotations'); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (!productSearch.trim()) { setProductResults([]); return; }
        const t = setTimeout(async () => {
            const res = await quotationService.searchProducts(productSearch, 5);
            setProductResults(res.data?.data?.products || []);
        }, 350);
        return () => clearTimeout(t);
    }, [productSearch]);

    const addProduct = (p: any) => {
        const exists = items.find(i => i.productId === p.id);
        if (exists) {
            setItems(prev => prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) - i.discount } : i));
        } else {
            const price = Number(p.price || 0);
            setItems(prev => [...prev, { productId: p.id, productName: p.translations?.[0]?.name || 'Product', unitPrice: price, quantity: 1, discount: 0, totalPrice: price }]);
        }
        setProductSearch(''); setProductResults([]);
    };

    const updateItem = (idx: number, field: 'quantity' | 'discount', value: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.unitPrice * updated.quantity - updated.discount;
            return updated;
        }));
    };

    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const taxableAmount = subtotal - overallDiscount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const grandTotal = taxableAmount + taxAmount;

    const handleSave = async (sendAfter = false) => {
        if (items.length === 0) { alert('Add at least one product.'); return; }
        if (!expiryDate) { alert('Expiry date is required.'); return; }
        try {
            setSaving(true);
            await quotationService.update(id as string, {
                customerName, customerEmail, customerPhone, customerAddress, companyName,
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity, discount: i.discount })),
                discount: overallDiscount, taxRate, notes, terms, expiryDate
            });
            if (sendAfter) await quotationService.send(id as string);
            router.push(`/admin/quotations/${id}`);
        } catch (e: any) { alert(e?.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-shielder-primary" /></div>;
    if (!quotation || !['DRAFT', 'SENT'].includes(quotation.status)) return (
        <div className="text-center py-20">
            <p className="text-gray-500 font-medium mb-4">This quotation cannot be edited in its current state ({quotation?.status}).</p>
            <Link href={`/admin/quotations/${id}`} className="text-shielder-primary font-bold hover:underline">← Back to Quotation</Link>
        </div>
    );

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <Link href={`/admin/quotations/${id}`} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><ArrowLeft size={18} /></Link>
                <div>
                    <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">Edit Quotation</h1>
                    <p className="text-gray-500 text-sm">{quotation.quotationNumber}</p>
                </div>
            </div>

            {/* Customer */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-shielder-primary text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
                    Customer Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Customer name *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <input type="email" className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Email *" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                    <input className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <input className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Company" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <input className="md:col-span-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                </div>
            </div>

            {/* Products */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-shielder-primary text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
                    Products
                </h2>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="Add products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {productResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                            {productResults.map(p => (
                                <button key={p.id} onClick={() => addProduct(p)} className="w-full flex justify-between px-4 py-3 hover:bg-gray-50 text-left border-b last:border-0">
                                    <span className="text-sm font-bold">{p.translations?.[0]?.name || 'Product'}</span>
                                    <span className="text-sm font-black text-shielder-primary">${Number(p.price).toFixed(2)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {items.length > 0 && (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="text-left py-2 text-[10px] uppercase text-gray-400 font-black">Product</th><th className="text-center py-2 text-[10px] uppercase text-gray-400 font-black">Qty</th><th className="text-center py-2 text-[10px] uppercase text-gray-400 font-black">Discount</th><th className="text-right py-2 text-[10px] uppercase text-gray-400 font-black">Total</th><th /></tr></thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50">
                                    <td className="py-3 font-medium text-gray-700">{item.productName}<br /><span className="text-xs text-gray-400">${item.unitPrice.toFixed(2)}/unit</span></td>
                                    <td className="py-3 text-center"><input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))} className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm" /></td>
                                    <td className="py-3 text-center"><input type="number" min={0} value={item.discount} onChange={e => updateItem(idx, 'discount', Math.max(0, Number(e.target.value)))} className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm" /></td>
                                    <td className="py-3 text-right font-black">${item.totalPrice.toFixed(2)}</td>
                                    <td className="py-3 pl-3"><button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {items.length > 0 && (
                    <div className="mt-4 flex justify-end">
                        <div className="w-64 space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-gray-500"><span>Overall Discount ($)</span><input type="number" min={0} value={overallDiscount} onChange={e => setOverallDiscount(Number(e.target.value))} className="w-20 text-right border border-gray-200 rounded py-0.5 px-2 text-sm" /></div>
                            <div className="flex justify-between items-center text-gray-500"><span>Tax (%)</span><input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-20 text-right border border-gray-200 rounded py-0.5 px-2 text-sm" /></div>
                            <div className="flex justify-between font-black text-shielder-dark border-t pt-1.5"><span>TOTAL</span><span className="text-shielder-primary">${grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-shielder-primary text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
                    Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Expiry Date *</label><input type="date" min={today} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" /></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Notes</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none" /></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Terms & Conditions</label><textarea rows={2} value={terms} onChange={e => setTerms(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none" /></div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <Link href={`/admin/quotations/${id}`} className="text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</Link>
                <div className="flex gap-3">
                    <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 disabled:opacity-50">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save Draft
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold text-sm hover:bg-[#FF5722] shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Save & Send
                    </button>
                </div>
            </div>
        </div>
    );
}
