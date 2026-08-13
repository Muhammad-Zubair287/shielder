'use client';

import React, { useEffect, useRef } from 'react';
import { Plus, Edit2, X, Upload, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';
import type { Subcategory, SubcategoryFormData, CategoryOption } from './types';
import { getImageUrl } from '@/utils/helpers';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const LIMITS = FIELD_LIMITS.subcategory;

interface Props {
  mode: 'create' | 'edit';
  subcategory?: Subcategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY: SubcategoryFormData = {
  categoryId: '',
  nameEn: '',
  descriptionEn: '',
  nameAr: '',
  descriptionAr: '',
  isActive: true,
};

export default function SubcategoryFormModal({
  mode,
  subcategory,
  onClose,
  onSuccess,
}: Props) {
  const { t, isRTL, locale } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = React.useState<SubcategoryFormData>(EMPTY);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [catsLoading, setCatsLoading] = React.useState(true);

  // ── Load category dropdown ─────────────────────────────────────────────────
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
      .finally(() => {
        if (mounted) setCatsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // ── Pre-fill for edit ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'edit' && subcategory) {
      setForm({
        categoryId: subcategory.categoryId || subcategory.category?.id || '',
        nameEn: subcategory.nameEn || subcategory.name || '',
        descriptionEn: subcategory.descriptionEn || subcategory.description || '',
        nameAr: subcategory.nameAr || '',
        descriptionAr: subcategory.descriptionAr || '',
        isActive: subcategory.isActive,
      });
      if (subcategory.image) {
        setImagePreview(getImageUrl(subcategory.image));
      }
    }
  }, [mode, subcategory]);

  // ── Image handling ─────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('upload.invalidImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('upload.imageTooLarge'));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setErrors((prev) => { const next = { ...prev }; delete next.image; return next; });
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateField = (field: keyof SubcategoryFormData, value: string): string => {
    if (field === 'nameEn') {
      if (!value.trim()) return t('subNameEnRequired');
      if (value.length > LIMITS.nameEn) return t('validation.maxLength');
    }
    if (field === 'nameAr' && value.length > LIMITS.nameAr) return t('validation.maxLength');
    if (field === 'descriptionEn' && value.length > LIMITS.descriptionEn) return t('validation.maxLength');
    if (field === 'descriptionAr' && value.length > LIMITS.descriptionAr) return t('validation.maxLength');
    return '';
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.categoryId) errs.categoryId = t('categoryIdRequired');
    if (!form.nameEn.trim()) errs.nameEn = t('subNameEnRequired');
    else if (form.nameEn.length > LIMITS.nameEn) errs.nameEn = t('validation.maxLength');
    if (form.nameAr.length > LIMITS.nameAr) errs.nameAr = t('validation.maxLength');
    if (form.descriptionEn.length > LIMITS.descriptionEn) errs.descriptionEn = t('validation.maxLength');
    if (form.descriptionAr.length > LIMITS.descriptionAr) errs.descriptionAr = t('validation.maxLength');
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return Object.keys(errs).length === 0;
  };

  const set = (field: keyof SubcategoryFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    } else {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('categoryId', form.categoryId);
    fd.append('nameEn', form.nameEn.trim());
    if (form.descriptionEn) fd.append('descriptionEn', form.descriptionEn.trim());
    if (form.nameAr) fd.append('nameAr', form.nameAr.trim());
    if (form.descriptionAr) fd.append('descriptionAr', form.descriptionAr.trim());
    fd.append('isActive', String(form.isActive));
    if (imageFile) fd.append('image', imageFile);

    try {
      setSubmitting(true);
      if (mode === 'create') {
        await adminService.createSubcategory(fd);
        toast.success(t('subcategoryCreated'));
      } else {
        await adminService.updateSubcategory(subcategory!.id, fd);
        toast.success(t('subcategoryUpdated'));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t(mode === 'create' ? 'subcategoryCreateFailed' : 'subcategoryUpdateFailed')
      );
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const catLabel = (c: CategoryOption) =>
    locale === 'ar' && c.nameAr ? c.nameAr : c.nameEn || c.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FF6B35] text-white">
              {mode === 'create' ? <Plus size={20} /> : <Edit2 size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {mode === 'create' ? t('addSubcategory') : t('editSubcategory')}
              </h2>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                {t('inventoryClassification')}
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

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Image Upload ── */}
          <div>
            <div
              className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-[#FF6B35] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">
                      {t('changeImage')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-full shadow-sm text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                    <Upload size={24} />
                  </div>
                  <p className="mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {t('clickToUploadSubcategory')}
                  </p>
                  <p className="text-[9px] text-gray-400 italic mt-0.5">{t('imageHint')}</p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
            {errors.image && (
              <p className="text-red-500 text-xs mt-1">{errors.image}</p>
            )}
          </div>

          {/* ── Parent Category ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('parentCategory')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                disabled={catsLoading}
                className={`w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm appearance-none cursor-pointer transition-all ${
                  errors.categoryId ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              >
                <option value="">{catsLoading ? t('loading') : t('selectCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catLabel(c)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${
                  isRTL ? 'left-3' : 'right-3'
                }`}
              />
            </div>
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>
            )}
          </div>

          {/* ── English Section ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">English</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('subcategoryNameEn')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                maxLength={LIMITS.nameEn}
                placeholder="e.g. Laptops"
                dir="ltr"
                className={`w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm transition-all ${
                  errors.nameEn ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.nameEn && (
                <p className="text-red-500 text-xs mt-1">{errors.nameEn}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('subcategoryDescEn')}
              </label>
              <textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
                maxLength={LIMITS.descriptionEn}
                placeholder="Short description in English..."
                dir="ltr"
                className={`w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm resize-none transition-all ${errors.descriptionEn ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.descriptionEn && <p className="text-red-500 text-xs mt-1">{errors.descriptionEn}</p>}
            </div>
          </div>

          {/* ── Arabic Section ── */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {t('arabicSection')}
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('subcategoryNameAr')}
              </label>
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                maxLength={LIMITS.nameAr}
                placeholder="مثال: أجهزة الكمبيوتر المحمولة"
                dir="rtl"
                className={`w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm transition-all ${errors.nameAr ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.nameAr && <p className="text-red-500 text-xs mt-1 text-right">{errors.nameAr}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('subcategoryDescAr')}
              </label>
              <textarea
                rows={2}
                value={form.descriptionAr}
                onChange={(e) => set('descriptionAr', e.target.value)}
                maxLength={LIMITS.descriptionAr}
                placeholder="وصف مختصر بالعربية..."
                dir="rtl"
                className={`w-full py-2.5 px-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] text-sm resize-none transition-all ${errors.descriptionAr ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.descriptionAr && <p className="text-red-500 text-xs mt-1 text-right">{errors.descriptionAr}</p>}
            </div>
          </div>

          {/* ── Active Toggle ── */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">{t('active')}</p>
              <p className="text-xs text-gray-400">{t('toggleVisibility')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => set('isActive', !form.isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isActive ? 'bg-[#16A34A]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.isActive
                    ? isRTL
                      ? 'translate-x-[-20px] left-[22px]'
                      : 'translate-x-5'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#FF5722] rounded-xl transition-all disabled:opacity-60 flex items-center gap-2 shadow-sm active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {t('save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
