'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Search, Package, Save, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import quotationService from '@/services/quotation.service';
import SARSymbol from '@/components/SARSymbol';
import { filterPhoneInput } from '@/utils/phoneUtils';

interface CartItem {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    totalPrice: number;
}

const QLIMITS = {
    customerName: 100,
    customerEmail: 254,
    customerPhone: 20,
    customerAddress: 200,
    companyName: 100,
    notes: 2000,
    terms: 2000,
};

export default function CreateQuotationPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Customer
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [companyName, setCompanyName] = useState('');

    const setField = (key: keyof typeof QLIMITS, setter: (v: string) => void, value: string) => {
        setter(value);
        const limit = QLIMITS[key];
        setFieldErrors(prev => ({
            ...prev,
            [key]: value.length > limit ? `Maximum ${limit} characters allowed` : '',
        }));
    };

    // Products
    const [items, setItems] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);

    // Settings
    const [expiryDate, setExpiryDate] = useState('');
    const [quotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [taxRate, setTaxRate] = useState(10);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');

    // Search products
    useEffect(() => {
        if (!productSearch.trim()) { setProductResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                setSearchingProducts(true);
                const res = await quotationService.searchProducts(productSearch, 5);
                setProductResults(res.data?.data?.products || []);
            } catch { setProductResults([]); }
            finally { setSearchingProducts(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const addProduct = (product: any) => {
        const exists = items.find(i => i.productId === product.id);
        if (exists) {
            setItems(prev => prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, totalPrice: (i.unitPrice * (i.quantity + 1)) - i.discount } : i));
        } else {
            const price = Number(product.price || 0);
            setItems(prev => [...prev, { productId: product.id, productName: product.translations?.[0]?.name || product.name || 'Product', unitPrice: price, quantity: 1, discount: 0, totalPrice: price }]);
        }
        setProductSearch('');
        setProductResults([]);
    };

    const updateItem = (idx: number, field: 'quantity' | 'discount', value: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.unitPrice * updated.quantity - updated.discount;
            return updated;
        }));
    };

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    // Totals
    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const taxableAmount = subtotal - overallDiscount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const grandTotal = taxableAmount + taxAmount;

    const handleSubmit = async (sendAfter = false) => {
        if (!customerName || !customerEmail) { alert('Customer name and email are required.'); return; }
        if (items.length === 0) { alert('Please add at least one product.'); return; }
        if (!expiryDate) { alert('Expiry date is required.'); return; }

        try {
            setSaving(true);
            const res = await quotationService.create({
                customerName, customerEmail, customerPhone, customerAddress, companyName,
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity, discount: i.discount })),
                discount: overallDiscount,
                taxRate,
                notes,
                terms,
                quotationDate,
                expiryDate
            });
            const quotation = res.data.data;
            if (sendAfter) await quotationService.send(quotation.id);
            router.push(`/admin/quotations/${quotation.id}`);
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Failed to create quotation');
        } finally {
            setSaving(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <Link href="/admin/quotations" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><ArrowLeft size={18} /></Link>
                <div>
                    <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">Create Quotation</h1>
                    <p className="text-gray-500 text-sm">Auto-number will be generated on save.</p>
                </div>
            </div>

            {/* Section 1: Customer */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
                    Customer Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Name *</label>
                        <input
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none ${fieldErrors.customerName ? 'border-red-400' : 'border-gray-200'}`}
                            value={customerName}
                            onChange={e => setField('customerName', setCustomerName, e.target.value)}
                            maxLength={QLIMITS.customerName}
                            placeholder="Customer full name"
                        />
                        {fieldErrors.customerName && <p className="text-red-500 text-xs mt-1">{fieldErrors.customerName}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Email *</label>
                        <input
                            type="email"
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none ${fieldErrors.customerEmail ? 'border-red-400' : 'border-gray-200'}`}
                            value={customerEmail}
                            onChange={e => setField('customerEmail', setCustomerEmail, e.target.value)}
                            maxLength={QLIMITS.customerEmail}
                            placeholder="customer@example.com"
                        />
                        {fieldErrors.customerEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.customerEmail}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Phone</label>
                        <input
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none ${fieldErrors.customerPhone ? 'border-red-400' : 'border-gray-200'}`}
                            value={customerPhone}
                            onChange={e => setField('customerPhone', setCustomerPhone, filterPhoneInput(e.target.value))}
                            maxLength={QLIMITS.customerPhone}
                            placeholder="+1 234 567 8900"
                        />
                        {fieldErrors.customerPhone && <p className="text-red-500 text-xs mt-1">{fieldErrors.customerPhone}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Company</label>
                        <input
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none ${fieldErrors.companyName ? 'border-red-400' : 'border-gray-200'}`}
                            value={companyName}
                            onChange={e => setField('companyName', setCompanyName, e.target.value)}
                            maxLength={QLIMITS.companyName}
                            placeholder="Company name (optional)"
                        />
                        {fieldErrors.companyName && <p className="text-red-500 text-xs mt-1">{fieldErrors.companyName}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Address</label>
                        <input
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none ${fieldErrors.customerAddress ? 'border-red-400' : 'border-gray-200'}`}
                            value={customerAddress}
                            onChange={e => setField('customerAddress', setCustomerAddress, e.target.value)}
                            maxLength={QLIMITS.customerAddress}
                            placeholder="Shipping / billing address"
                        />
                        {fieldErrors.customerAddress && <p className="text-red-500 text-xs mt-1">{fieldErrors.customerAddress}</p>}
                    </div>
                </div>
            </div>

            {/* Section 2: Products */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
                    Products
                </h2>

                {/* Product search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none" placeholder="Search products to add..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {productResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                            {searchingProducts ? <div className="p-3 text-center text-sm text-gray-400">Searching...</div> :
                                productResults.map(p => (
                                    <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <Package size={16} className="text-gray-400 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{p.translations?.[0]?.name || 'Product'}</p>
                                                <p className="text-xs text-gray-400">Stock: {p.stock}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-shielder-primary inline-flex items-center gap-0.5"><SARSymbol />{Number(p.price).toFixed(2)}</span>
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>

                {/* Items table */}
                {items.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                                    <th className="text-center py-2 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Unit Price</th>
                                    <th className="text-center py-2 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Qty</th>
                                    <th className="text-center py-2 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Discount</th>
                                    <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Line Total</th>
                                    <th className="py-2 px-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 px-3 font-medium text-gray-700">{item.productName}</td>
                                        <td className="py-3 px-3 text-center text-gray-500"><span className="inline-flex items-center gap-0.5"><SARSymbol />{item.unitPrice.toFixed(2)}</span></td>
                                        <td className="py-3 px-3 text-center">
                                            <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))} className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-shielder-primary/20" />
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <input type="number" min={0} value={item.discount} onChange={e => updateItem(idx, 'discount', Math.max(0, Number(e.target.value)))} className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-shielder-primary/20" />
                                        </td>
                                        <td className="py-3 px-3 text-right font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><SARSymbol />{item.totalPrice.toFixed(2)}</span></td>
                                        <td className="py-3 px-3">
                                            <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <Package size={32} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-gray-400 text-sm">Search and add products above</p>
                    </div>
                )}

                {/* Totals */}
                {items.length > 0 && (
                    <div className="mt-6 border-t border-gray-100 pt-4 flex justify-end">
                        <div className="w-72 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Subtotal</span><span className="inline-flex items-center gap-0.5"><SARSymbol />{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>Overall Discount (SAR)</span>
                                <input type="number" min={0} value={overallDiscount} onChange={e => setOverallDiscount(Math.max(0, Number(e.target.value)))} className="w-24 text-right border border-gray-200 rounded-lg py-1 px-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>Tax (%)</span>
                                <input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))} className="w-24 text-right border border-gray-200 rounded-lg py-1 px-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Tax Amount</span><span className="inline-flex items-center gap-0.5"><SARSymbol />{taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-black text-shielder-dark border-t border-gray-200 pt-2 mt-2">
                                <span>GRAND TOTAL</span>
                                <span className="text-shielder-primary text-lg inline-flex items-center gap-0.5"><SARSymbol />{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 3: Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black uppercase tracking-widest text-shielder-dark mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
                    Quotation Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Quotation Date</label>
                        <input type="date" disabled value={quotationDate} className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Expiry Date *</label>
                        <input type="date" min={today} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Notes</label>
                        <textarea
                            rows={3}
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none resize-none ${fieldErrors.notes ? 'border-red-400' : 'border-gray-200'}`}
                            value={notes}
                            onChange={e => setField('notes', setNotes, e.target.value)}
                            maxLength={QLIMITS.notes}
                            placeholder="Internal notes for this quotation..."
                        />
                        {fieldErrors.notes && <p className="text-red-500 text-xs mt-1">{fieldErrors.notes}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Terms & Conditions</label>
                        <textarea
                            rows={3}
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none resize-none ${fieldErrors.terms ? 'border-red-400' : 'border-gray-200'}`}
                            value={terms}
                            onChange={e => setField('terms', setTerms, e.target.value)}
                            maxLength={QLIMITS.terms}
                            placeholder="Payment terms, delivery conditions, warranty..."
                        />
                        {fieldErrors.terms && <p className="text-red-500 text-xs mt-1">{fieldErrors.terms}</p>}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Link href="/admin/quotations" className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</Link>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSubmit(false)} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save as Draft
                    </button>
                    <button onClick={() => handleSubmit(true)} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold text-sm hover:bg-[#FF5722] transition-colors shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Save & Send
                    </button>
                </div>
            </div>
        </div>
    );
}
