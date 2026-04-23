'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowUpDown,
  Box,
  Building2,
  CheckCircle2,
  Filter,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Save,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';
import { warehouseService } from '@/services/warehouse.service';
import { inventoryService, type InventoryRecord, type InventoryProduct, type InventoryWarehouse } from '@/services/inventory.service';
import UnifiedPagination from '@/components/ui/UnifiedPagination';

type LookupOption = {
  id: string;
  label: string;
  sku?: string;
};

type InventoryModalState = {
  productId: string;
  warehouseId: string;
  quantity: string;
};

type Props = {
  scope: 'admin' | 'superadmin';
};

const asArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.products)) return value.products as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  return [];
};

const getProductLabel = (product?: InventoryProduct, fallback = 'Product') =>
  product?.translations?.[0]?.name || product?.name || fallback;

const getWarehouseLabel = (warehouse?: InventoryWarehouse, fallback = 'Warehouse') =>
  warehouse?.name || fallback;

const toAvailable = (item: InventoryRecord) => Math.max(0, Number(item.quantity || 0) - Number(item.reservedQuantity || 0));

function Modal({
  open,
  title,
  subtitle,
  state,
  setState,
  products,
  warehouses,
  saving,
  onClose,
  onSave,
  t,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  state: InventoryModalState;
  setState: React.Dispatch<React.SetStateAction<InventoryModalState>>;
  products: LookupOption[];
  warehouses: LookupOption[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  t: (key: string) => string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FF6B35]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B35]">
              <Box size={12} />
              {t('inventory')}
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>

          <button onClick={onClose} className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6 md:grid-cols-3">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('product')}</span>
            <div className="relative">
              <Package size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={state.productId}
                onChange={(e) => setState((prev) => ({ ...prev, productId: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
              >
                <option value="">{t('allProducts') || 'Select product'}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}{product.sku ? ` • ${product.sku}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('warehouse')}</span>
            <div className="relative">
              <Warehouse size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={state.warehouseId}
                onChange={(e) => setState((prev) => ({ ...prev, warehouseId: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
              >
                <option value="">{t('allWarehouses') || 'Select warehouse'}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="space-y-2 md:col-span-3">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('quantity')}</span>
            <div className="relative">
              <ArrowUpDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min={0}
                value={state.quantity}
                onChange={(e) => setState((prev) => ({ ...prev, quantity: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
                placeholder="0"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <X size={16} />
            {t('cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('saving') || 'Saving' : t('save') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryManagementPage({ scope }: Props) {
  const { t, isRTL } = useLanguage();
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<LookupOption[]>([]);
  const [warehouses, setWarehouses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ productId: '', warehouseId: '' });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null);
  const [modalState, setModalState] = useState<InventoryModalState>({ productId: '', warehouseId: '', quantity: '0' });

  const roleLabel = scope === 'admin' ? 'Admin' : 'Super Admin';

  const loadLookups = useCallback(async () => {
    try {
      setLookupLoading(true);
      const [productRes, warehouseRes] = await Promise.all([
        adminService.getProductsForManagement({ page: 1, limit: 500 }),
        warehouseService.list(),
      ]);

      const productRows = asArray<any>(productRes?.data?.data?.products ?? productRes?.data?.data ?? productRes?.data ?? productRes);
      setProducts(productRows.map((product: any) => ({
        id: product.id,
        label: product.translations?.[0]?.name || product.name || product.sku || product.id,
        sku: product.sku,
      })));

      const warehouseRows = asArray<any>(warehouseRes?.data?.data ?? warehouseRes?.data ?? warehouseRes);
      setWarehouses(warehouseRows.map((warehouse: any) => ({
        id: warehouse.id,
        label: `${warehouse.name}${warehouse.city ? ` • ${warehouse.city}` : ''}`,
      })));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('inventoryLoadFailed') || 'Failed to load inventory lookups.');
    } finally {
      setLookupLoading(false);
    }
  }, [t]);

  const loadInventory = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await inventoryService.list({
        page,
        limit,
        productId: filters.productId || undefined,
        warehouseId: filters.warehouseId || undefined,
      });

      const payload = response?.data ?? response;
      const items = asArray<InventoryRecord>(payload);
      setInventory(items);
      setTotal(Number(response?.pagination?.total ?? payload?.pagination?.total ?? payload?.total ?? 0));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('inventoryLoadFailed') || 'Failed to load inventory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.productId, filters.warehouseId, limit, page, t]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;

    return inventory.filter((item) => {
      const productName = getProductLabel(item.product, '').toLowerCase();
      const warehouseName = getWarehouseLabel(item.warehouse, '').toLowerCase();
      const sku = item.product?.sku?.toLowerCase() || '';
      return [productName, warehouseName, sku].some((value) => value.includes(q));
    });
  }, [inventory, search]);

  const summary = useMemo(() => {
    const totalStock = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalAvailable = inventory.reduce((sum, item) => sum + toAvailable(item), 0);
    const outOfStock = inventory.filter((item) => toAvailable(item) <= 0).length;
    return { totalStock, totalAvailable, outOfStock };
  }, [inventory]);

  const openModal = (record?: InventoryRecord) => {
    setSelectedRecord(record || null);
    setModalState({
      productId: record?.productId || '',
      warehouseId: record?.warehouseId || '',
      quantity: String(record?.quantity ?? 0),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRecord(null);
  };

  const handleSave = async () => {
    if (!modalState.productId) {
      toast.error(t('inventorySelectProduct') || 'Select a product.');
      return;
    }
    if (!modalState.warehouseId) {
      toast.error(t('inventorySelectWarehouse') || 'Select a warehouse.');
      return;
    }

    const quantity = Number(modalState.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error(t('inventoryInvalidQuantity') || 'Enter a valid stock quantity.');
      return;
    }

    try {
      setSaving(true);
      await inventoryService.upsert({
        productId: modalState.productId,
        warehouseId: modalState.warehouseId,
        quantity,
      });
      toast.success(t('inventorySaved') || 'Inventory updated successfully.');
      closeModal();
      loadInventory();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('inventorySaveFailed') || 'Failed to save inventory.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-br from-[#5B5FC7]/10 via-white to-[#FF6B35]/10 blur-3xl" aria-hidden="true" />

      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/15 bg-[#FF6B35]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B35]">
              <Building2 size={12} />
              {t('inventory')}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">{t('inventoryManagement') || t('inventory')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('inventoryManagementSubtitle') || 'Manage product stock per warehouse and keep orders in sync.'}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500">
              {roleLabel}
            </span>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:-translate-y-0.5"
            >
              <Plus size={16} />
              {t('addInventory') || 'Add Inventory'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('stockCol') || t('stock')}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{summary.totalStock}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('availableStock') || 'Available Stock'}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{summary.totalAvailable}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('outOfStock') || 'Out of Stock'}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{summary.outOfStock}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('inventorySearchPlaceholder') || 'Search by product, SKU, or warehouse...'}
              className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter size={14} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <select
                value={filters.productId}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, productId: e.target.value }));
                }}
                disabled={lookupLoading}
                className={`min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              >
                <option value="">{t('allProducts') || 'All Products'}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.label}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Warehouse size={14} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <select
                value={filters.warehouseId}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, warehouseId: e.target.value }));
                }}
                disabled={lookupLoading}
                className={`min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              >
                <option value="">{t('allWarehouses') || 'All Warehouses'}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setSearch('');
                setFilters({ productId: '', warehouseId: '' });
                setPage(1);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <XCircle size={14} />
              {t('clearFilters') || 'Clear'}
            </button>

            <button
              onClick={() => loadInventory()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
              {t('refresh')}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 font-semibold">{t('product')}</th>
                <th className="px-4 py-3 font-semibold">{t('warehouse')}</th>
                <th className="px-4 py-3 font-semibold">{t('stock')}</th>
                <th className="px-4 py-3 font-semibold">{t('availableStock') || 'Available'}</th>
                <th className="px-4 py-3 font-semibold">{t('reservedStock') || 'Reserved'}</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
                <th className="px-4 py-3 font-semibold">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">{t('loading')}</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    {t('inventoryEmpty') || 'No inventory records found.'}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const available = toAvailable(item);
                  return (
                    <tr key={item.id} className="border-t border-gray-100 text-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{getProductLabel(item.product)}</span>
                          <span className="text-xs text-gray-400">{item.product?.sku || item.productId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{getWarehouseLabel(item.warehouse)}</span>
                          <span className="text-xs text-gray-400">{[item.warehouse?.city, item.warehouse?.country].filter(Boolean).join(', ') || item.warehouseId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{available}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.reservedQuantity}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {available > 0 ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {available > 0 ? (t('inStock') || 'In Stock') : (t('outOfStock') || 'Out of Stock')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openModal(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Save size={13} />
                          {t('updateStock') || 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <UnifiedPagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / limit))}
            totalItems={total}
            pageSize={limit}
            onPageChange={setPage}
            isRTL={isRTL}
          />
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={selectedRecord ? (t('editInventory') || 'Update Inventory') : (t('addInventory') || 'Add Inventory')}
        subtitle={selectedRecord ? (t('inventoryModalEditSubtitle') || 'Adjust the stock for an existing product and warehouse pair.') : (t('inventoryModalCreateSubtitle') || 'Create or update stock for a product warehouse pair.')}
        state={modalState}
        setState={setModalState}
        products={products}
        warehouses={warehouses}
        saving={saving}
        onClose={closeModal}
        onSave={handleSave}
        t={t}
      />
    </main>
  );
}
