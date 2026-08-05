'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { warehouseService, Warehouse } from '@/services/warehouse.service';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const LIMITS = FIELD_LIMITS.warehouse;

type Props = {
  mode: 'create' | 'edit';
  warehouse: Warehouse | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function WarehouseFormModal({ mode, warehouse, onClose, onSuccess }: Props) {
  const { isRTL } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    isMain: false,
    isActive: true,
  });

  useEffect(() => {
    if (warehouse) {
      setForm({
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        country: warehouse.country,
        isMain: warehouse.isMain,
        isActive: warehouse.isActive,
      });
    }
  }, [warehouse]);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === 'string') {
      const err = validateField(key as string, value);
      setErrors((prev) => ({ ...prev, [key]: err }));
    }
  };

  const validateField = (key: string, value: string): string => {
    if (key === 'name') {
      if (!value.trim()) return 'Name is required.';
      if (value.length > LIMITS.name) return `Maximum ${LIMITS.name} characters allowed`;
    }
    if (key === 'city') {
      if (!value.trim()) return 'City is required.';
      if (value.length > LIMITS.city) return `Maximum ${LIMITS.city} characters allowed`;
    }
    if (key === 'country') {
      if (!value.trim()) return 'Country is required.';
      if (value.length > LIMITS.country) return `Maximum ${LIMITS.country} characters allowed`;
    }
    if (key === 'address') {
      if (!value.trim()) return 'Address is required.';
      if (value.length > LIMITS.address) return `Maximum ${LIMITS.address} characters allowed`;
    }
    return '';
  };

  const validateAll = (): boolean => {
    const errs: Record<string, string> = {};
    const fields: Array<keyof typeof form> = ['name', 'city', 'country', 'address'];
    fields.forEach((key) => {
      const err = validateField(key, String(form[key]));
      if (err) errs[key] = err;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    try {
      setSaving(true);

      if (mode === 'create') {
        await warehouseService.create({
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          isMain: form.isMain,
          isActive: form.isActive,
        });
        toast.success('Warehouse created successfully.');
      } else if (warehouse) {
        await warehouseService.update(warehouse.id, {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          isMain: form.isMain,
          isActive: form.isActive,
        });
        toast.success('Warehouse updated successfully.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save warehouse.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? 'Add Warehouse' : 'Edit Warehouse'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Name <span className="text-red-500">*</span></span>
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                maxLength={LIMITS.name}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Main Warehouse"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></span>
              <input
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                maxLength={LIMITS.city}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Riyadh"
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Country <span className="text-red-500">*</span></span>
              <input
                value={form.country}
                onChange={(e) => setField('country', e.target.value)}
                maxLength={LIMITS.country}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${errors.country ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Saudi Arabia"
              />
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setField('isMain', e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">Main Warehouse</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></span>
            <textarea
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              maxLength={LIMITS.address}
              className={`min-h-[96px] w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${errors.address ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="Warehouse full address"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ef5a23] disabled:opacity-60"
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Warehouse' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
