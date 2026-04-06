'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, X, ChevronDown, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';
import settingsService from '@/services/settings.service';
import type { Product, ProductFormData, DropdownOption } from './types';
import { EMPTY_PRODUCT_FORM } from './types';
import { getImageUrl } from '@/utils/helpers';

interface Props {
  mode: 'create' | 'edit';
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductFormModal({ mode, product, onClose, onSuccess }: Props) {
  const { t, isRTL, locale } = useLanguage();

  const [form, setForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Dropdown data
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [subcategories, setSubcategories] = useState<DropdownOption[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<string>('10');

  // ── Load global low stock default for create mode ────────────────────────
  useEffect(() => {
    let mounted = true;
    settingsService
      .getSettings()
      .then((res: any) => {
        if (!mounted) return;
        const threshold = res?.data?.data?.lowStockThreshold;
        if (typeof threshold === 'number' && Number.isFinite(threshold)) {
          const value = String(threshold);
          setDefaultLowStockThreshold(value);
          // ProductFormModal mounts fresh for create, so safe to seed current form.
          if (mode === 'create') {
            setForm((prev) => ({ ...prev, minimumStockThreshold: value }));
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [mode]);

  // ── Load categories once ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    adminService
      .getCategories({ limit: 500, page: 1, isActive: true })
      .then((res: any) => {
        if (!mounted) return;
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
      .catch(() => {})
      .finally(() => { if (mounted) setCatsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── Load subcategories when categoryId changes ───────────────────────────
  useEffect(() => {
    if (!form.categoryId) { setSubcategories([]); return; }
    let mounted = true;
    setSubLoading(true);
    adminService
      .getSubcategories({ limit: 500, page: 1, categoryId: form.categoryId, isActive: true })
      .then((res: any) => {
        if (!mounted) return;
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
      .catch(() => {})
      .finally(() => { if (mounted) setSubLoading(false); });
    return () => { mounted = false; };
  }, [form.categoryId]);

  // ── Pre-fill for edit — fetch full product to get both EN + AR translations ───
  useEffect(() => {
    if (mode !== 'edit' || !product) return;
    let mounted = true;
    adminService
      .getProductById(product.id)
      .then((res: any) => {
        if (!mounted) return;
        const p = res.data?.data || res.data;
        const translations: any[] = p.translations || [];
        const en = translations.find((t: any) => t.locale === 'en') || {};
        const ar = translations.find((t: any) => t.locale === 'ar') || {};
        setForm({
          nameEn: en.name || p.nameEn || p.name || '',
          nameAr: ar.name || p.nameAr || '',
          descriptionEn: en.description || p.descriptionEn || '',
          descriptionAr: ar.description || p.descriptionAr || '',
          sku: p.sku || '',
          price: String(p.price),
          stock: String(p.stock),
          minimumStockThreshold: String(p.minimumStockThreshold ?? Number(defaultLowStockThreshold)),
          categoryId: p.categoryId || p.category?.id || '',
          subcategoryId: p.subcategoryId || p.subcategory?.id || '',
          isActive: p.isActive,
          filterNumber: p.filterNumber || '',
          alternateNumbers: p.alternateNumbers || '',
          filterType: p.filterType || '',
          material: p.material || '',
          dimensions: p.dimensions || '',
        });
        if (p.mainImage) {
          setImagePreview(getImageUrl(p.mainImage));
        }
      })
      .catch(() => {
        // Fallback to data already in the list row
        setForm({
          nameEn: product.name || '',
          nameAr: '',
          descriptionEn: '',
          descriptionAr: '',
          sku: product.sku || '',
          price: String(product.price),
          stock: String(product.stock),
          minimumStockThreshold: String(product.minimumStockThreshold ?? Number(defaultLowStockThreshold)),
          categoryId: product.categoryId || '',
          subcategoryId: product.subcategoryId || '',
          isActive: product.isActive,
          filterNumber: product.filterNumber || '',
          alternateNumbers: product.alternateNumbers || '',
          filterType: product.filterType || '',
          material: product.material || '',
          dimensions: product.dimensions || '',
        });
      });
    return () => { mounted = false; };
  }, [mode, product, defaultLowStockThreshold]);

  // ── Image handling ────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jfif'].includes(file.type)) {
      toast.error(t('imageHint'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field: keyof ProductFormData, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Reset subcategoryId when category changes
      if (field === 'categoryId') next.subcategoryId = '';
      return next;
    });
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const optionLabel = (o: DropdownOption) =>
    locale === 'ar' && o.nameAr ? o.nameAr : o.nameEn || o.name || '';

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nameEn.trim()) errs.nameEn = t('productNameEnRequired');
    if (!form.categoryId) errs.categoryId = t('productCategoryRequired');
    if (!form.subcategoryId) errs.subcategoryId = t('productSubcategoryRequired');
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price < 0) errs.price = t('productPriceRequired');
    const stock = parseInt(form.stock, 10);
    if (!form.stock || isNaN(stock) || stock < 0) errs.stock = t('productStockRequired');
    const threshold = parseInt(form.minimumStockThreshold, 10);
    if (!form.minimumStockThreshold || isNaN(threshold) || threshold < 0)
      errs.minimumStockThreshold = t('productThresholdRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Build translations array for the backend
    const translations: { locale: string; name: string; description?: string }[] = [
      { locale: 'en', name: form.nameEn.trim(), description: form.descriptionEn.trim() || undefined },
    ];
    if (form.nameAr.trim()) {
      translations.push({ locale: 'ar', name: form.nameAr.trim(), description: form.descriptionAr.trim() || undefined });
    }

    const payload = {
      translations,
      sku: form.sku.trim() || undefined,
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      minimumStockThreshold: parseInt(form.minimumStockThreshold, 10),
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      isActive: form.isActive,
      filterNumber: form.filterNumber.trim() || undefined,
      alternateNumbers: form.alternateNumbers.trim() || undefined,
      filterType: form.filterType.trim() || undefined,
      material: form.material.trim() || undefined,
      dimensions: form.dimensions.trim() || undefined,
    };

    try {
      setSubmitting(true);
      let productId: string;

      if (mode === 'create') {
        const res = await adminService.createProduct(payload);
        productId = res.data?.data?.id;
      } else {
        await adminService.updateProduct(product!.id, payload);
        productId = product!.id;
      }

      // Upload image if one was selected
      if (imageFile && productId) {
        try {
          await adminService.uploadProductImage(productId, imageFile);
        } catch (imgErr: any) {
          // Product saved; just warn about image
          toast.error('Product saved but image upload failed. Please retry from Edit.');
          onSuccess();
          onClose();
          return;
        }
      }

      toast.success(t(mode === 'create' ? 'productCreated' : 'productUpdated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t(mode === 'create' ? 'productCreateFailed' : 'productUpdateFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reusable field components ─────────────────────────────────────────────
  const inputClass = (hasError: boolean) =>
    `w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm transition-all ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
    }`;

  const selectClass = (hasError: boolean) =>
    `w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm appearance-none cursor-pointer transition-all ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
    }`;

  const chevronPos = isRTL ? 'left-3' : 'right-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-2xl max-h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FF6B35] text-white">
              {mode === 'create' ? <Plus size={20} /> : <Edit2 size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {mode === 'create' ? t('addProduct') : t('editProduct')}
              </h2>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                {t('productDetails')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
            aria-label={t('cancel')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Product Image ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('uploadImage')}
            </label>
            <div
              className="w-full h-44 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-[#FF6B35] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">
                      {t('changeImage')}
                    </span>
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="absolute top-2 end-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                    aria-label={t('removeImage')}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-full shadow-sm text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                    <Upload size={26} />
                  </div>
                  <p className="mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {t('clickToUploadProduct')}
                  </p>
                  <p className="text-[9px] text-gray-400 italic mt-0.5">{t('imageHint')}</p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/webp,image/jfif"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* ── Category & Subcategory ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productCategory')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  disabled={catsLoading}
                  className={selectClass(!!errors.categoryId)}
                >
                  <option value="">
                    {catsLoading ? t('loading') : t('selectCategory')}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {optionLabel(c)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${chevronPos}`}
                />
              </div>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>
              )}
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productSubcategory')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.subcategoryId}
                  onChange={(e) => set('subcategoryId', e.target.value)}
                  disabled={!form.categoryId || subLoading}
                  className={selectClass(!!errors.subcategoryId)}
                >
                  <option value="">
                    {subLoading
                      ? t('loading')
                      : !form.categoryId
                      ? t('selectCategory')
                      : t('selectSubcategory')}
                  </option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {optionLabel(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${chevronPos}`}
                />
              </div>
              {errors.subcategoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.subcategoryId}</p>
              )}
            </div>
          </div>

          {/* ── English Section ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">English</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productNameEn')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                placeholder="e.g. Industrial Filter Pump"
                dir="ltr"
                className={inputClass(!!errors.nameEn)}
              />
              {errors.nameEn && (
                <p className="text-red-500 text-xs mt-1">{errors.nameEn}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productDescEn')}
              </label>
              <textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
                placeholder="Short description in English..."
                dir="ltr"
                className={inputClass(false) + ' resize-none'}
              />
            </div>
          </div>

          {/* ── Arabic Section ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {t('arabicSection')}
            </p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productNameAr')}
              </label>
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                placeholder="مثال: مضخة فلتر صناعية"
                dir="rtl"
                className={inputClass(false)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('productDescAr')}
              </label>
              <textarea
                rows={2}
                value={form.descriptionAr}
                onChange={(e) => set('descriptionAr', e.target.value)}
                placeholder="وصف مختصر بالعربية..."
                dir="rtl"
                className={inputClass(false) + ' resize-none'}
              />
            </div>
          </div>

          {/* ── Pricing & Inventory ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {t('inventory')}
            </p>

            {/* SKU */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="e.g. SKU-001"
                className={inputClass(false)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('productPrice')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="0.00"
                  className={inputClass(!!errors.price)}
                />
                {errors.price && (
                  <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                )}
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('productStock')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  placeholder="0"
                  className={inputClass(!!errors.stock)}
                />
                {errors.stock && (
                  <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
                )}
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('productThreshold')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.minimumStockThreshold}
                  onChange={(e) => set('minimumStockThreshold', e.target.value)}
                  placeholder="10"
                  className={inputClass(!!errors.minimumStockThreshold)}
                />
                {errors.minimumStockThreshold && (
                  <p className="text-red-500 text-xs mt-1">{errors.minimumStockThreshold}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Filter Details ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Filter Details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter Number</label>
                <input
                  type="text"
                  value={form.filterNumber}
                  onChange={(e) => set('filterNumber', e.target.value)}
                  placeholder="e.g. FN-AF-001"
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter Type</label>
                <input
                  type="text"
                  value={form.filterType}
                  onChange={(e) => set('filterType', e.target.value)}
                  placeholder="e.g. Air Filter"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alternate Numbers</label>
              <input
                type="text"
                value={form.alternateNumbers}
                onChange={(e) => set('alternateNumbers', e.target.value)}
                placeholder="e.g. AF001, AIR-001, 123456  (comma-separated)"
                className={inputClass(false)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Material</label>
                <input
                  type="text"
                  value={form.material}
                  onChange={(e) => set('material', e.target.value)}
                  placeholder="e.g. Synthetic"
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dimensions</label>
                <input
                  type="text"
                  value={form.dimensions}
                  onChange={(e) => set('dimensions', e.target.value)}
                  placeholder="e.g. 250mm x 150mm x 50mm"
                  className={inputClass(false)}
                />
              </div>
            </div>
          </div>

          {/* ── Active toggle ── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => set('isActive', !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] focus:ring-offset-2 ${
                form.isActive ? 'bg-[#5B5FC7]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive
                    ? isRTL
                      ? '-translate-x-6'
                      : 'translate-x-6'
                    : isRTL
                    ? '-translate-x-1'
                    : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
              {t('isActiveLabel')}
            </label>
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-60"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            form=""
            disabled={submitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#FF5722] rounded-xl transition-all flex items-center gap-2 disabled:opacity-60 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('loading')}
              </>
            ) : mode === 'create' ? (
              t('addProduct')
            ) : (
              t('save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
