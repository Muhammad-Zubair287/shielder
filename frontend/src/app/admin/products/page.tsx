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
  PackageSearch,
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

      setProducts(prodRes.data.data || prodRes.data.products || []);
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
      className="space-y-6 pb-6"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t('productsTitle')}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('productsTitle')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('productsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5B5FC7] hover:bg-[#4a4fb3] text-white rounded-xl transition-all font-semibold shadow-md active:scale-95 text-sm"
          >
            <Upload size={16} />
            {t('bulkImport')}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF5722] text-white rounded-xl transition-all font-semibold shadow-md active:scale-95 text-sm"
          >
            <Plus size={18} />
            {t('addProduct')}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                {card.label}
              </p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">{card.value}</h3>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${card.color}18` }}>
              <card.Icon size={24} style={{ color: card.color }} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center">
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
            className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm transition-all ${
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
              className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm appearance-none cursor-pointer ${
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
                className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm appearance-none cursor-pointer ${
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
            className="p-2.5 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-colors border border-gray-200 disabled:opacity-40"
            title={t('refresh')}
            aria-label={t('refresh')}
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
