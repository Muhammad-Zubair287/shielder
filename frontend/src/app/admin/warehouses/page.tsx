'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, RefreshCcw, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import WarehouseFormModal from './WarehouseFormModal';
import { warehouseService, Warehouse } from '@/services/warehouse.service';

export default function AdminWarehousesPage() {
  const { isRTL, t } = useLanguage();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Warehouse | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await warehouseService.list();
      setWarehouses(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) =>
      [w.name, w.address, w.city, w.country].some((v) => v?.toLowerCase().includes(q))
    );
  }, [search, warehouses]);

  const onEdit = (warehouse: Warehouse) => {
    setSelected(warehouse);
    setFormMode('edit');
  };

  const onDelete = async (warehouse: Warehouse) => {
    const ok = window.confirm(`Delete warehouse "${warehouse.name}"?`);
    if (!ok) return;

    try {
      await warehouseService.remove(warehouse.id);
      toast.success('Warehouse deleted successfully.');
      fetchWarehouses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete warehouse.');
    }
  };

  return (
    <main className="space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/15 bg-[#FF6B35]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B35]">
              <Building2 size={12} />
              {t('warehouse') || 'Warehouse'}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
              {t('warehouseManagement') || 'Warehouse Management'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('warehouseManagementSubtitle') || 'Manage storage locations for inventory operations.'}
            </p>
          </div>

          <button
            onClick={() => {
              setSelected(null);
              setFormMode('create');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#ef5a23]"
          >
            <Plus size={16} />
            {t('addWarehouse') || 'Add Warehouse'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`}
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchWarehouse') || 'Search warehouses...'}
              className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${
                isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
              }`}
            />
          </div>

          <button
            onClick={fetchWarehouses}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            {t('refresh')}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 font-semibold">{t('name')}</th>
                <th className="px-4 py-3 font-semibold">{t('address')}</th>
                <th className="px-4 py-3 font-semibold">{t('city')}</th>
                <th className="px-4 py-3 font-semibold">{t('country')}</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
                <th className="px-4 py-3 font-semibold">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    {t('noDataFound') || 'No warehouses found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="border-t border-gray-100 text-gray-700">
                    <td className="px-4 py-3 font-semibold text-gray-900">{w.name}</td>
                    <td className="px-4 py-3 max-w-[340px] truncate" title={w.address}>{w.address}</td>
                    <td className="px-4 py-3">{w.city}</td>
                    <td className="px-4 py-3">{w.country}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(w)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={13} />
                          {t('edit')}
                        </button>
                        <button
                          onClick={() => onDelete(w)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          {t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formMode && (
        <WarehouseFormModal
          mode={formMode}
          warehouse={selected}
          onClose={() => {
            setFormMode(null);
            setSelected(null);
          }}
          onSuccess={fetchWarehouses}
        />
      )}
    </main>
  );
}
