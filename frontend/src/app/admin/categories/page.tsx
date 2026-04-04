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
      className="space-y-6 pb-6"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t('categoriesTitle')}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('categoriesTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('categoriesSubtitle')}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF5722] text-white rounded-xl transition-all font-semibold shadow-md active:scale-95 text-sm"
          aria-label={t('addCategory')}
        >
          <Plus size={18} />
          {t('addCategory')}
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {card.label}
              </p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">{card.value}</h3>
            </div>
            <div
              className="p-3 rounded-2xl"
              style={{ backgroundColor: `${card.color}18` }}
            >
              <card.icon size={24} style={{ color: card.color }} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center">
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
            className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm transition-all ${
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
              className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm appearance-none cursor-pointer ${
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
            className="p-2.5 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-colors border border-gray-200 disabled:opacity-40"
            title={t('refresh')}
            aria-label={t('refresh')}
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
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
