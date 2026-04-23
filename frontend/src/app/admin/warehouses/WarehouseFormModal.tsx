'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { warehouseService, Warehouse } from '@/services/warehouse.service';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  mode: 'create' | 'edit';
  warehouse: Warehouse | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function WarehouseFormModal({ mode, warehouse, onClose, onSuccess }: Props) {
  const { isRTL } = useLanguage();
  const [saving, setSaving] = useState(false);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error('Please complete all required fields.');
      return;
    }

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
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                placeholder="Main Warehouse"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">City</span>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                placeholder="Riyadh"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Country</span>
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                placeholder="Saudi Arabia"
                required
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm((prev) => ({ ...prev, isMain: e.target.checked }))}
              />
              <span className="text-sm font-medium text-gray-700">Main Warehouse</span>
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-gray-700">Address</span>
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="min-h-[96px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
              placeholder="Warehouse full address"
              required
            />
          </label>

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
