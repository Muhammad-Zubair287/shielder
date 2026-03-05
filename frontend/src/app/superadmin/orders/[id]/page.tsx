'use client';

import React, { useEffect, useState } from 'react';
import SARSymbol from '@/components/SARSymbol';
import { 
  ArrowLeft, 
  Printer, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Phone, 
  Mail,
  Box,
  ChevronRight,
  ShieldCheck,
  Truck,
  XCircle
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import { getImageUrl } from '@/utils/helpers';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrderDetailPage() {
  const { t, isRTL } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await orderService.getOrderById(id as string);
        setOrder(response.data);
      } catch (err) {
        toast.error('Failed to load order details');
        router.push('/superadmin/orders');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id, router]);

  const updateStatus = async (status: string) => {
    try {
      await orderService.updateOrderStatus(order.id, { status });
      toast.success(`Order status updated to ${status}`);
      const response = await orderService.getOrderById(order.id);
      setOrder(response.data);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-shielder-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold italic">{t('gatheringOrderData')}</p>
      </div>
    );
  }

  if (!order) return null;

  const subtotal = parseFloat(order.subtotal);
  const tax = parseFloat(order.tax);
  const total = parseFloat(order.total);

  return (
    <div className="space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link 
            href="/superadmin/orders" 
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="text-gray-600" size={24} />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-gray-900">{order.orderNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700 border-green-200' : 
                order.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{t('placedOn')} {new Date(order.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Printer size={18} />
            <span>{t('printInvoice')}</span>
          </button>
          
          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <div className="relative group">
              <button className="bg-[#FF6B35] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#FF6B35]/20 flex items-center space-x-2 transition-all active:scale-95 hover:bg-[#FF5722]">
                <span>{t('updateStatus')}</span>
                <ChevronRight size={16} />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(stat => (
                  <button 
                    key={stat}
                    onClick={() => updateStatus(stat)}
                    disabled={stat === order.status}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-shielder-primary transition-colors disabled:opacity-50"
                  >
                    Mark as {stat.charAt(0) + stat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Items Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Package className="text-shielder-primary" size={20} />
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">{t('orderedItems')}</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('productCol')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('priceCol')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('qtyCol')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('subtotalCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items?.map((item: any) => (
                    <tr key={item.id} className="group">
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.product?.mainImage ? (
                              <img src={getImageUrl(item.product.mainImage) || ''} alt="Product" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }} />
                            ) : (
                              <Box size={24} className="text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-shielder-primary transition-colors">{item.product?.translations?.[0]?.name || 'Product'}</p>
                            <p className="text-xs font-mono text-gray-400 mt-0.5">SKU: {item.product?.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-gray-700"><span className="inline-flex items-center gap-0.5"><SARSymbol />{parseFloat(item.unitPrice).toFixed(2)}</span></td>
                      <td className="px-6 py-5 text-center font-black text-gray-900">×{item.quantity}</td>
                      <td className="px-6 py-5 text-right font-black text-gray-900"><span className="inline-flex items-center gap-0.5"><SARSymbol />{parseFloat(item.totalPrice).toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-gray-50/50 flex justify-end">
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>{t('subtotal')}</span>
                  <span className="inline-flex items-center gap-0.5"><SARSymbol />{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-500">
                  <span>{t('tax')} (Estimated)</span>
                  <span className="inline-flex items-center gap-0.5"><SARSymbol />{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
                  <span className="text-lg font-black text-gray-900 italic">{t('grandTotal')}</span>
                  <span className="text-2xl font-black text-shielder-primary inline-flex items-center gap-0.5"><SARSymbol />{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center space-x-2">
              <Truck size={20} className="text-shielder-secondary" />
              <span>{t('orderActivity')}</span>
            </h2>
            <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
               {/* Order Created */}
               <div className="relative pl-10">
                <div className="absolute left-0 top-1 w-7 h-7 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white">
                  <Package size={12} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t('orderCreatedLabel')}</p>
                  <p className="text-xs text-gray-400 font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Status Specific Timeline Item */}
              {order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-shielder-primary rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white">
                    <ShieldCheck size={12} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t('orderStatusUpdatedMsg')} {order.status}</p>
                    <p className="text-xs text-gray-400 font-medium">{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {order.status === 'CANCELLED' && (
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-red-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white">
                    <XCircle size={12} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t('orderCancelledLabel')}</p>
                    <p className="text-xs text-gray-400 font-medium">{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Current Status Marker */}
              {order.status === 'DELIVERED' && (
                <div className="relative pl-10">
                  <div className="absolute left-0 top-1 w-7 h-7 bg-green-600 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white">
                    <Truck size={12} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t('orderDeliveredLabel')}</p>
                    <p className="text-xs text-gray-400 font-medium">{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-8">
          {/* Customer Info */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
             <div className="flex items-center space-x-3 pb-4 border-b border-gray-50">
                <div className="w-12 h-12 bg-shielder-primary/10 text-shielder-primary rounded-2xl flex items-center justify-center">
                    <User size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('customer')}</p>
                  <p className="font-black text-gray-900 leading-tight">{order.customerName}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-start space-x-3">
                    <Mail className="text-gray-400 mt-0.5" size={16} />
                    <div>
                        <p className="text-xs font-bold text-gray-400">{t('emailAddress')}</p>
                        <p className="text-sm font-bold text-gray-700">{order.user?.email}</p>
                    </div>
                </div>
                <div className="flex items-start space-x-3">
                    <Phone className="text-gray-400 mt-0.5" size={16} />
                    <div>
                        <p className="text-xs font-bold text-gray-400">{t('phoneCol')}</p>
                        <p className="text-sm font-bold text-gray-700">{order.phoneNumber || order.user?.profile?.phoneNumber || 'N/A'}</p>
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="flex items-center space-x-2 text-sm font-black text-gray-900 uppercase tracking-widest">
                <MapPin size={16} className="text-shielder-primary" />
                <span>{t('shippingAddress')}</span>
            </h3>
            <p className="text-sm font-bold text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {order.shippingAddress}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
             <h3 className="flex items-center space-x-2 text-sm font-black text-gray-900 uppercase tracking-widest">
                <CreditCard size={16} className="text-shielder-secondary" />
                <span>{t('paymentInfo')}</span>
            </h3>
            <div className={`p-4 rounded-2xl border ${order.paymentStatus === 'PAID' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <p className="text-xs font-bold text-gray-400 uppercase">Method: <span className="text-gray-900">{order.paymentMethod || 'Manual'}</span></p>
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm font-black ${order.paymentStatus === 'PAID' ? 'text-green-700' : 'text-red-700'}`}>{order.paymentStatus}</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
