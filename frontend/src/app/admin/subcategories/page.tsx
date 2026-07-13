'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Search,
  RefreshCcw,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSyncRefetch } from '@/hooks/useSyncRefetch';
import { broadcastSync } from '@/lib/crossTabSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';

import SubcategoriesTable from './SubcategoriesTable';
import SubcategoryFormModal from './SubcategoryFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { Subcategory, SubcategorySummary, CategoryOption } from './types';

export default function AdminSubcategoriesPage() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [summary, setSummary] = useState<SubcategorySummary>({
    totalSubcategories: 0,
    activeSubcategories: 0,
    disabledSubcategories: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // ── Fetch category dropdown (once) ────────────────────────────────────────
  useEffect(() => {
    adminService
      .getCategories({ limit: 500, page: 1, isActive: true })
      .then((res: any) => {
        const raw: any[] = res.data.data || [];
        setCategories(
          raw.map((c: any) => ({
            id: c.id,
            nameEn: c.nameEn || c.name || '',
            nameAr: c.nameAr || '',
            name: c.name || c.nameEn || '',
          }))
        );
      })
      .catch(() => {});
  }, []);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [subRes, summaryRes] = await Promise.all([
        adminService.getSubcategories({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          categoryId: categoryFilter || undefined,
        }),
        adminService.getSubcategorySummary(),
      ]);

      setSubcategories(subRes.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: subRes.data.pagination?.total || 0,
        pages: subRes.data.pagination?.totalPages || subRes.data.pagination?.pages || 1,
      }));
      setSummary(
        summaryRes.data.data || {
          totalSubcategories: 0,
          activeSubcategories: 0,
          disabledSubcategories: 0,
        }
      );
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error(err?.response?.data?.message || t('fetchSubcategoriesFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, categoryFilter, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
      fetchData();
    }
  }, [fetchData, authLoading, isAuthenticated, user]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [search, categoryFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => { setSelectedSubcategory(null); setFormMode('create'); };
  const openEdit = (s: Subcategory) => { setSelectedSubcategory(s); setFormMode('edit'); };
  const openDelete = (s: Subcategory) => setDeleteTarget(s);
  const closeForm = () => { setFormMode(null); setSelectedSubcategory(null); };
  const closeDelete = () => setDeleteTarget(null);
  const onMutationSuccess = () => {
    fetchData();
    broadcastSync({ type: 'DATA_CHANGED', module: 'subcategories' });
  };
  useSyncRefetch(fetchData, 'subcategories');

  const catLabel = (c: CategoryOption) =>
    locale === 'ar' && c.nameAr ? c.nameAr : c.nameEn || c.name;

  const summaryCards = [
    { label: t('totalSubcategories'), value: summary.totalSubcategories, icon: Layers, color: '#5B5FC7' },
    { label: t('activeSubcategories'), value: summary.activeSubcategories, icon: CheckCircle2, color: '#16A34A' },
    { label: t('disabledSubcategories'), value: summary.disabledSubcategories, icon: X, color: '#DC2626' },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5B5FC7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main
      className="relative space-y-6 pb-8"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t('subcategoriesTitle')}
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-br from-[#5B5FC7]/10 via-white to-[#FF6B35]/10 blur-3xl" aria-hidden="true" />

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 sm:py-7">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B5FC7]/5 via-transparent to-[#FF6B35]/5" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`inline-flex items-center gap-2 rounded-full border border-[#5B5FC7]/15 bg-[#5B5FC7]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#5B5FC7] ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles size={12} />
              {t('subcategoriesTitle')}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{t('subcategoriesTitle')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-[15px]">{t('subcategoriesSubtitle')}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
          >
            <Plus size={18} />
            {t('addSubcategory')}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-gray-50 opacity-80" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{card.label}</p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-gray-900">{card.value}</h3>
              </div>
              <div className="rounded-2xl border border-white/70 p-3 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: `${card.color}14` }}>
                <card.icon size={24} style={{ color: card.color }} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
            size={16}
          />
            <input
              type="text"
              placeholder={t('searchSubcategories')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir="ltr"
              className="input-ltr w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm"
            />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {/* Category filter */}
          <div className="relative flex-1 md:w-52">
            <Filter
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              size={14}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="rounded-xl border border-gray-200 p-3 text-gray-400 transition-colors hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] disabled:opacity-40"
            title={t('refresh')}
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <X size={16} />
            {t('clearFilters') || 'Clear Filters'}
          </button>
        </div>
      </div>

      {/* Table */}
      <SubcategoriesTable
        subcategories={subcategories}
        loading={loading || refreshing}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* Modals */}
      {formMode && (
        <SubcategoryFormModal
          mode={formMode}
          subcategory={selectedSubcategory}
          onClose={closeForm}
          onSuccess={onMutationSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationModal
          subcategory={deleteTarget}
          onClose={closeDelete}
          onSuccess={onMutationSuccess}
        />
      )}
    </main>
  );
}
