'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Upload,
  Search,
  RefreshCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  PackageSearch,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';

import ProductsTable from './ProductsTable';
import ProductFormModal from './ProductFormModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import BulkUploadModal from './BulkUploadModal';
import type { Product, ProductSummary, DropdownOption } from './types';

const sortByStockPriority = (items: Product[]): Product[] => {
  return [...items].sort((a, b) => {
    const aThreshold = Number.isFinite(a.minimumStockThreshold) ? a.minimumStockThreshold : 0;
    const bThreshold = Number.isFinite(b.minimumStockThreshold) ? b.minimumStockThreshold : 0;

    const aRank = a.stock <= 0 ? 0 : a.stock <= aThreshold ? 1 : 2;
    const bRank = b.stock <= 0 ? 0 : b.stock <= bThreshold ? 1 : 2;

    if (aRank !== bRank) return aRank - bRank;
    if (a.stock !== b.stock) return a.stock - b.stock;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
};

export default function AdminProductsPage() {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<ProductSummary>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [subcategories, setSubcategories] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // ── Load categories dropdown (once) ───────────────────────────────────────
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

  // ── Load subcategories when category filter changes ────────────────────────
  useEffect(() => {
    setSubcategoryFilter('');
    if (!categoryFilter) { setSubcategories([]); return; }
    adminService
      .getSubcategories({ limit: 500, page: 1, categoryId: categoryFilter, isActive: true })
      .then((res: any) => {
        const raw: any[] = res.data.data || [];
        setSubcategories(
          raw.map((s: any) => ({
            id: s.id,
            nameEn: s.nameEn || s.name || '',
            nameAr: s.nameAr || '',
            name: s.name || s.nameEn || '',
          }))
        );
      })
      .catch(() => {});
  }, [categoryFilter]);

  // ── Fetch products + summary ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [prodRes, summaryRes] = await Promise.all([
        adminService.getProductsForManagement({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          subcategoryId: subcategoryFilter || undefined,
        }),
        adminService.getProductSummary(),
      ]);

      setProducts(sortByStockPriority(prodRes.data.data || prodRes.data.products || []));
      setPagination((prev) => ({
        ...prev,
        total: prodRes.data.pagination?.total || prodRes.data.total || 0,
        pages: prodRes.data.pagination?.totalPages || prodRes.data.pagination?.pages || prodRes.data.pages || 1,
      }));

      const s = summaryRes.data.data || summaryRes.data || {};
      setSummary({
        totalProducts: s.totalProducts ?? s.total ?? 0,
        activeProducts: s.activeProducts ?? s.active ?? 0,
        lowStockProducts: s.lowStockProducts ?? s.lowStock ?? 0,
        outOfStockProducts: s.outOfStockProducts ?? s.outOfStock ?? 0,
      });
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error(err?.response?.data?.message || t('fetchProductsFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, categoryFilter, subcategoryFilter, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
      fetchData();
    }
  }, [fetchData, authLoading, isAuthenticated, user]);

  // Reset page on filter change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [search, categoryFilter, subcategoryFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => { setSelectedProduct(null); setFormMode('create'); };
  const openEdit = (p: Product) => { setSelectedProduct(p); setFormMode('edit'); };
  const openDelete = (p: Product) => setDeleteTarget(p);
  const closeForm = () => { setFormMode(null); setSelectedProduct(null); };
  const closeDelete = () => setDeleteTarget(null);
  const onMutationSuccess = () => fetchData();

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setSubcategoryFilter('');
  };

  const optionLabel = (o: DropdownOption) =>
    locale === 'ar' && o.nameAr ? o.nameAr : o.nameEn || o.name || '';

  // ── Summary cards ──────────────────────────────────────────────────────────
  const summaryCards = [
    { label: t('totalProducts'), value: summary.totalProducts, Icon: Package, color: '#5B5FC7' },
    { label: t('activeProducts'), value: summary.activeProducts, Icon: CheckCircle2, color: '#16A34A' },
    { label: t('lowStock'), value: summary.lowStockProducts, Icon: AlertTriangle, color: '#D97706' },
    { label: t('outOfStock'), value: summary.outOfStockProducts, Icon: XCircle, color: '#DC2626' },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5B5FC7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main
      className="relative space-y-6 pb-8"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t('productsTitle')}
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-br from-[#5B5FC7]/10 via-white to-[#FF6B35]/10 blur-3xl" aria-hidden="true" />

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 sm:py-7">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B5FC7]/5 via-transparent to-[#FF6B35]/5" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`inline-flex items-center gap-2 rounded-full border border-[#5B5FC7]/15 bg-[#5B5FC7]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#5B5FC7] ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles size={12} />
              {t('productsTitle')}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              {t('productsTitle')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-[15px]">
              {t('productsSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#5B5FC7]/15 bg-white px-4 py-3 text-sm font-semibold text-[#334155] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#5B5FC7]/25 hover:shadow-md"
            >
              <Upload size={16} className="text-[#5B5FC7]" />
              {t('bulkImport')}
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF5722] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              <Plus size={18} />
              {t('addProduct')}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-gray-50 opacity-80" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight">
                  {card.label}
                </p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-gray-900">{card.value}</h3>
              </div>
              <div className="rounded-2xl border border-white/70 p-3 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: `${card.color}14` }}>
                <card.Icon size={24} style={{ color: card.color }} aria-hidden="true" />
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
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
            size={16}
          />
          <input
            type="text"
            placeholder={t('searchProducts')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="ltr"
            className={`input-ltr w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${
              isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Category filter */}
          <div className="relative flex-1 md:w-44">
            <Filter
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              size={14}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${
                isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'
              }`}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {optionLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory filter — only when a category is selected */}
          {categoryFilter && (
            <div className="relative flex-1 md:w-44">
              <PackageSearch
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
                size={14}
              />
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className={`w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${
                  isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'
                }`}
              >
                <option value="">{t('allSubcategories')}</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {optionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <X size={16} />
            {t('clearFilters') || 'Clear Filters'}
          </button>
        </div>
      </div>

      {/* ── Products Table ── */}
      <ProductsTable
        products={products}
        loading={loading || refreshing}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* ── Modals ── */}
      {formMode && (
        <ProductFormModal
          mode={formMode}
          product={selectedProduct}
          onClose={closeForm}
          onSuccess={onMutationSuccess}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationModal
          product={deleteTarget}
          onClose={closeDelete}
          onSuccess={onMutationSuccess}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { setShowBulkUpload(false); onMutationSuccess(); }}
        />
      )}
    </main>
  );
}
