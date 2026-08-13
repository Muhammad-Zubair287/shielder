'use client';

import React, { useRef, useEffect } from 'react';
import { Plus, Edit2, X, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';
import type { Category, CategoryFormData } from './types';
import { getImageUrl } from '@/utils/helpers';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const LIMITS = FIELD_LIMITS.category;

interface Props {
  mode: 'create' | 'edit';
  category?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryFormModal({ mode, category, onClose, onSuccess }: Props) {
  const { t, isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState<CategoryFormData>({
    nameEn: '',
    descriptionEn: '',
    nameAr: '',
    descriptionAr: '',
    isActive: true,
  });
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Pre-fill for edit mode
  useEffect(() => {
    if (mode === 'edit' && category) {
      setFormData({
        nameEn: category.nameEn || category.name || '',
        descriptionEn: category.descriptionEn || category.description || '',
        nameAr: category.nameAr || '',
        descriptionAr: category.descriptionAr || '',
        isActive: category.isActive,
      });
      if (category.image) {
        setImagePreview(getImageUrl(category.image));
      }
    }
  }, [mode, category]);

  const validateField = (field: keyof CategoryFormData, value: string): string => {
    if (field === 'nameEn') {
      if (!value.trim()) return t('nameEnRequired');
      if (value.length > LIMITS.nameEn) return t('validation.maxLength');
    }
    if (field === 'nameAr' && value.length > LIMITS.nameAr) return t('validation.maxLength');
    if (field === 'descriptionEn' && value.length > LIMITS.descriptionEn) return t('validation.maxLength');
    if (field === 'descriptionAr' && value.length > LIMITS.descriptionAr) return t('validation.maxLength');
    return '';
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.nameEn.trim()) errs.nameEn = t('nameEnRequired');
    else if (formData.nameEn.length > LIMITS.nameEn) errs.nameEn = t('validation.maxLength');
    if (formData.nameAr.length > LIMITS.nameAr) errs.nameAr = t('validation.maxLength');
    if (formData.descriptionEn.length > LIMITS.descriptionEn) errs.descriptionEn = t('validation.maxLength');
    if (formData.descriptionAr.length > LIMITS.descriptionAr) errs.descriptionAr = t('validation.maxLength');
    if (mode === 'create' && !imageFile) errs.image = t('imageRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return toast.error(t('upload.invalidImageType'));
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error(t('upload.imageTooLarge'));
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    // Clear image validation error
    setErrors((prev) => { const e = { ...prev }; delete e.image; return e; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = new FormData();
    data.append('nameEn', formData.nameEn.trim());
    if (formData.descriptionEn) data.append('descriptionEn', formData.descriptionEn.trim());
    if (formData.nameAr) data.append('nameAr', formData.nameAr.trim());
    if (formData.descriptionAr) data.append('descriptionAr', formData.descriptionAr.trim());
    data.append('isActive', String(formData.isActive));
    if (imageFile) data.append('image', imageFile);

    try {
      setSubmitting(true);
      if (mode === 'create') {
        await adminService.createCategory(data);
        toast.success(t('categoryCreated'));
      } else {
        await adminService.updateCategory(category!.id, data);
        toast.success(t('categoryUpdated'));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t(mode === 'create' ? 'categoryCreateFailed' : 'categoryUpdateFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof CategoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    } else {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
                {mode === 'create' ? t('addCategory') : t('editCategory')}
              </h2>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                {t('inventoryClassification')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Image upload */}
            <div>
              <div
                className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-[#FF6B35] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
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
                      {t('clickToUpload')}
                    </p>
                    <p className="text-[9px] text-gray-400 italic mt-0.5">{t('imageHint')}</p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
              </div>
              {errors.image && (
                <p className="text-red-500 text-xs mt-1">{errors.image}</p>
              )}
            </div>

            {/* English name */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">
                {t('nameEn')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                maxLength={LIMITS.nameEn}
                placeholder="e.g. Earthmoving Equipment"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#5B5FC7] focus:bg-white focus:outline-none transition-all text-sm font-medium ${
                  errors.nameEn ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.nameEn && <p className="text-red-500 text-xs mt-1">{errors.nameEn}</p>}
            </div>

            {/* English description */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">
                {t('descriptionEn')}
              </label>
              <textarea
                rows={2}
                value={formData.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
                maxLength={LIMITS.descriptionEn}
                placeholder="English description..."
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#5B5FC7] focus:bg-white focus:outline-none transition-all text-sm font-medium resize-none ${errors.descriptionEn ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.descriptionEn && <p className="text-red-500 text-xs mt-1">{errors.descriptionEn}</p>}
            </div>

            {/* Arabic separator */}
            <div className="border-t border-dashed border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t('arabicSection')}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-4" dir="rtl">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 text-right">
                    {t('nameAr')}
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => set('nameAr', e.target.value)}
                    maxLength={LIMITS.nameAr}
                    placeholder="مثال: معدات الحفر"
                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:bg-white focus:outline-none transition-all text-sm font-medium ${errors.nameAr ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.nameAr && <p className="text-red-500 text-xs mt-1 text-right">{errors.nameAr}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 text-right">
                    {t('descriptionAr')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descriptionAr}
                    onChange={(e) => set('descriptionAr', e.target.value)}
                    maxLength={LIMITS.descriptionAr}
                    placeholder="وصف الفئة بالعربية..."
                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:bg-white focus:outline-none transition-all text-sm font-medium resize-none ${errors.descriptionAr ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.descriptionAr && <p className="text-red-500 text-xs mt-1 text-right">{errors.descriptionAr}</p>}
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-800">{t('active')}</p>
                <p className="text-[10px] text-gray-500 italic">{t('toggleVisibility')}</p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !formData.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  formData.isActive ? 'bg-[#16A34A]' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={formData.isActive}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-[#FF6B35] hover:bg-[#FF5722] text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {mode === 'create' ? t('addCategory') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
