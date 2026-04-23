'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, Search, Package, ClipboardList, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { warehouseService } from '@/services/warehouse.service';
import { toast } from 'react-hot-toast';

type Props = {
  scope: 'admin' | 'superadmin';
};

export default function WarehouseDetailPage({ scope }: Props) {
  const { id } = useParams();
  const { isRTL, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [warehouse, setWarehouse] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);

  const backHref = scope === 'admin' ? '/admin/warehouses' : '/superadmin/warehouses';

  const fetchDetails = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await warehouseService.getById(id as string, {
        page: 1,
        limit: 15,
        productSearch: productSearch || undefined,
        orderSearch: orderSearch || undefined,
        orderStatus: orderStatus || undefined,
      });
      const data = res?.data || {};
      setWarehouse(data.warehouse || null);
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load warehouse details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, orderSearch, orderStatus, productSearch]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">{t('loading')}</div>;
  }

  if (!warehouse) {
    return <div className="p-8 text-sm text-gray-500">Warehouse not found.</div>;
  }

  return (
    <main className="space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF6B35]">
              <ArrowLeft size={14} />
              Back to Warehouses
            </Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/15 bg-[#FF6B35]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B35]">
              <Building2 size={12} />
              Warehouse Detail
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">{warehouse.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{warehouse.address}, {warehouse.city}, {warehouse.country}</p>
          </div>

          <div className="flex items-center gap-2">
            {warehouse.isMain && (
              <span className="rounded-full bg-orange-100 px-3 py-2 text-xs font-bold text-orange-700">Main Warehouse</span>
            )}
            <span className={`rounded-full px-3 py-2 text-xs font-bold ${warehouse.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {warehouse.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={fetchDetails}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
              {t('refresh')}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-600">Products</h2>
            <span className="text-xs text-gray-400">Total: {pagination?.totalProducts || 0}</span>
          </div>

          <div className="relative mb-3">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchDetails(); }}
              placeholder="Filter products"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B35]"
            />
          </div>

          <div className="space-y-2">
            {products.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No products linked to this warehouse.</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{product.translations?.[0]?.name || product.sku || product.id}</p>
                    <p className="text-xs text-gray-400">SKU: {product.sku || '—'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    <Package size={12} /> Stock: {product.stock}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-600">Orders</h2>
            <span className="text-xs text-gray-400">Total: {pagination?.totalOrders || 0}</span>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchDetails(); }}
                placeholder="Filter orders"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B35]"
              />
            </div>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="READY_FOR_PICKUP">Ready for pickup</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <button
            onClick={fetchDetails}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ClipboardList size={12} /> Apply filters
          </button>

          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No orders linked to this warehouse.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Customer: {order.customerName || order.users?.profile?.fullName || order.users?.email || '—'}</p>
                  <p className="text-xs text-gray-500">Total: SAR {Number(order.total || 0).toFixed(2)} • Items: {order._count?.orderItems || 0}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
