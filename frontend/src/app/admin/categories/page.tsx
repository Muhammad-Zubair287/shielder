'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
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
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';

import CategoriesTable from './CategoriesTable';
import CategoryFormModal from './CategoryFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import type { Category, CategorySummary } from './types';

export default function AdminCategoriesPage() {
  const { t, isRTL } = useLanguage();

  // ── State ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<CategorySummary>({
    totalCategories: 0,
    activeCategories: 0,
    disabledCategories: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [catRes, summaryRes] = await Promise.all([
        adminService.getCategories({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          isActive:
            statusFilter === '' ? undefined : statusFilter === 'ACTIVE',
        }),
        adminService.getCategorySummary(),
      ]);

      setCategories(catRes.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: catRes.data.pagination?.total || 0,
        pages: catRes.data.pagination?.totalPages || catRes.data.pagination?.pages || 1,
      }));
      setSummary(
        summaryRes.data.data || {
          totalCategories: 0,
          activeCategories: 0,
          disabledCategories: 0,
        }
      );
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error(
          err?.response?.data?.message || t('fetchCategoriesFailed')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [search, statusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelectedCategory(null);
    setFormMode('create');
  };

  const openEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setFormMode('edit');
  };

  const openDelete = (cat: Category) => setDeleteTarget(cat);

  const closeForm = () => {
    setFormMode(null);
    setSelectedCategory(null);
  };

  const closeDelete = () => setDeleteTarget(null);

  const onMutationSuccess = () => fetchData();

  const summaryCards = [
    {
      label: t('totalCategories'),
      value: summary.totalCategories,
      icon: FolderTree,
      color: '#5B5FC7',
    },
    {
      label: t('activeCategories'),
      value: summary.activeCategories,
      icon: CheckCircle2,
      color: '#16A34A',
    },
    {
      label: t('disabledCategories'),
      value: summary.disabledCategories,
      icon: X,
      color: '#DC2626',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main
      className="relative space-y-6 pb-8"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t('categoriesTitle')}
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-br from-[#5B5FC7]/10 via-white to-[#FF6B35]/10 blur-3xl" aria-hidden="true" />

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 sm:py-7">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B5FC7]/5 via-transparent to-[#FF6B35]/5" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`inline-flex items-center gap-2 rounded-full border border-[#5B5FC7]/15 bg-[#5B5FC7]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#5B5FC7] ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles size={12} />
              {t('categoriesTitle')}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{t('categoriesTitle')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-[15px]">{t('categoriesSubtitle')}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            aria-label={t('addCategory')}
          >
            <Plus size={18} />
            {t('addCategory')}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-gray-50 opacity-80" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {card.label}
                </p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-gray-900">{card.value}</h3>
              </div>
              <div
                className="rounded-2xl border border-white/70 p-3 shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${card.color}14` }}
              >
                <card.icon size={24} style={{ color: card.color }} aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
              isRTL ? 'right-3' : 'left-3'
            }`}
            size={16}
          />
          <input
            type="text"
            placeholder={t('searchCategories')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="ltr"
            className={`input-ltr w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${
              isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
            aria-label={t('search')}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="relative flex-1 md:w-44">
            <Filter
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
                isRTL ? 'right-3' : 'left-3'
              }`}
              size={14}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${
                isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'
              }`}
              aria-label={t('filter')}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="ACTIVE">{t('activeOnly')}</option>
              <option value="DISABLED">{t('disabledOnly')}</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="rounded-xl border border-gray-200 p-3 text-gray-400 transition-colors hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] disabled:opacity-40"
            title={t('refresh')}
            aria-label={t('refresh')}
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <X size={16} />
            {t('clearFilters') || 'Clear Filters'}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <CategoriesTable
        categories={categories}
        loading={loading || refreshing}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* ── Modals ── */}
      {formMode && (
        <CategoryFormModal
          mode={formMode}
          category={selectedCategory}
          onClose={closeForm}
          onSuccess={onMutationSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationModal
          category={deleteTarget}
          onClose={closeDelete}
          onSuccess={onMutationSuccess}
        />
      )}
    </main>
  );
}
