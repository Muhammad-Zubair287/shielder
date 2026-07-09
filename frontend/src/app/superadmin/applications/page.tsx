'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, Plus, RefreshCcw, Search, Pencil, Trash2, ToggleLeft, ToggleRight, X, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { applicationService, Application, ApplicationPayload, ApplicationPlatform, ApplicationStatus } from '@/services/application.service';
import { getImageUrl } from '@/utils/helpers';
import Image from 'next/image';

type FormState = {
  applicationName: string;
  platform: ApplicationPlatform;
  downloadUrl: string;
  description: string;
  status: ApplicationStatus;
  image: File | null;
};

const DEFAULT_FORM: FormState = {
  applicationName: '',
  platform: 'ANDROID',
  downloadUrl: '',
  description: '',
  status: 'ACTIVE',
  image: null,
};

export default function SuperAdminApplicationsPage() {
  const { isRTL, t } = useLanguage();

  const [apps, setApps] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchApps = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await applicationService.list();
      setApps(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const filtered = apps.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [a.applicationName, a.downloadUrl, a.platform].some((v) => v?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setImagePreview(null);
    setFormMode('create');
  };

  const openEdit = (app: Application) => {
    setSelected(app);
    setForm({
      applicationName: app.applicationName,
      platform: app.platform,
      downloadUrl: app.downloadUrl,
      description: app.description || '',
      status: app.status,
      image: null,
    });
    setImagePreview(getImageUrl(app.image));
    setFormMode('edit');
  };

  const closeModal = () => {
    setFormMode(null);
    setSelected(null);
    setForm(DEFAULT_FORM);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, image: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: ApplicationPayload = {
        applicationName: form.applicationName,
        platform: form.platform,
        downloadUrl: form.downloadUrl,
        description: form.description,
        status: form.status,
        image: form.image,
      };

      if (formMode === 'create') {
        await applicationService.create(payload);
        toast.success(t('applicationsAddNew') ? `${t('applicationsAddNew')} — success` : 'Application created successfully.');
      } else if (selected) {
        await applicationService.update(selected.id, payload);
        toast.success('Application updated successfully.');
      }
      closeModal();
      fetchApps();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (app: Application) => {
    const ok = window.confirm(`Delete application "${app.applicationName}"?`);
    if (!ok) return;
    try {
      await applicationService.remove(app.id);
      toast.success('Application deleted successfully.');
      fetchApps();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete application.');
    }
  };

  const handleToggleStatus = async (app: Application) => {
    const newStatus: ApplicationStatus = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await applicationService.updateStatus(app.id, newStatus);
      toast.success(`Application ${newStatus === 'ACTIVE' ? t('applicationsActivate') || 'activated' : t('applicationsDeactivate') || 'deactivated'}.`);
      fetchApps();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const platformBadge = (platform: ApplicationPlatform) => {
    if (platform === 'ANDROID') {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          {t('applicationsAndroid') || 'Android'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
        {t('applicationsIOS') || 'iOS'}
      </span>
    );
  };

  const statusBadge = (status: ApplicationStatus) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          {t('applicationsActive') || 'Active'}
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        {t('applicationsInactive') || 'Inactive'}
      </span>
    );
  };

  return (
    <main className="space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header card */}
      <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/15 bg-[#FF6B35]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF6B35]">
              <Smartphone size={12} />
              {t('applicationsManage') || 'Applications'}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
              {t('applicationsTitle') || 'Mobile Applications'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('applicationsSubtitle') || 'Manage downloadable mobile applications for your customers.'}
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#ef5a23]"
          >
            <Plus size={16} />
            {t('applicationsAddNew') || 'Add Application'}
          </button>
        </div>

        {/* Summary counts */}
        <div className="mt-5 flex gap-4 flex-wrap">
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm min-w-[120px]">
            <p className="text-xs font-medium text-gray-500">{t('applicationsTitle') || 'Total Apps'}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{apps.length}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 shadow-sm min-w-[120px]">
            <p className="text-xs font-medium text-green-600">{t('applicationsActive') || 'Active'}</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{apps.filter((a) => a.status === 'ACTIVE').length}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 shadow-sm min-w-[120px]">
            <p className="text-xs font-medium text-red-600">{t('applicationsInactive') || 'Inactive'}</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{apps.filter((a) => a.status === 'INACTIVE').length}</p>
          </div>
        </div>
      </section>

      {/* Table section */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`}
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
              dir="ltr"
              className={`input-ltr w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm outline-none focus:border-[#FF6B35] ${
                isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
              }`}
            />
          </div>
          <button
            onClick={fetchApps}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            {t('refresh')}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-semibold">{t('applicationImage') || 'Image'}</th>
                  <th className="px-4 py-3 font-semibold">{t('applicationName') || 'App Name'}</th>
                  <th className="px-4 py-3 font-semibold">{t('applicationPlatform') || 'Platform'}</th>
                  <th className="px-4 py-3 font-semibold">{t('applicationStatus') || 'Status'}</th>
                  <th className="px-4 py-3 font-semibold">{t('applicationDownloadUrl') || 'Download URL'}</th>
                  <th className="px-4 py-3 font-semibold">{t('actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      {t('noDataFound') || 'No applications found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((app) => {
                    const imgUrl = getImageUrl(app.image);
                    return (
                      <tr key={app.id} className="border-t border-gray-100 text-gray-700">
                        <td className="px-4 py-3">
                          {imgUrl ? (
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-100">
                              <Image src={imgUrl} alt={app.applicationName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                              <Smartphone size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{app.applicationName}</td>
                        <td className="px-4 py-3">{platformBadge(app.platform)}</td>
                        <td className="px-4 py-3">{statusBadge(app.status)}</td>
                        <td className="px-4 py-3 max-w-[220px] truncate">
                          <a
                            href={app.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF6B35] hover:underline"
                          >
                            {app.downloadUrl}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(app)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={13} />
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(app)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                                app.status === 'ACTIVE'
                                  ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                                  : 'border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {app.status === 'ACTIVE' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                              {app.status === 'ACTIVE'
                                ? t('applicationsDeactivate') || 'Deactivate'
                                : t('applicationsActivate') || 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(app)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                              {t('delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Create / Edit Modal */}
      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {formMode === 'create'
                  ? t('applicationsAddNew') || 'Add Application'
                  : t('edit') || 'Edit Application'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5 overflow-y-auto">
              {/* App Name */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationName') || 'App Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.applicationName}
                  onChange={(e) => setForm((f) => ({ ...f, applicationName: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationPlatform') || 'Platform'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as ApplicationPlatform }))}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                >
                  <option value="ANDROID">{t('applicationsAndroid') || 'Android'}</option>
                  <option value="IOS">{t('applicationsIOS') || 'iOS'}</option>
                </select>
              </div>

              {/* Download URL */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationDownloadUrl') || 'Download URL'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.downloadUrl}
                  onChange={(e) => setForm((f) => ({ ...f, downloadUrl: e.target.value }))}
                  required
                  placeholder="https://..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationDescription') || 'Description'}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35] resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationStatus') || 'Status'}
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]"
                >
                  <option value="ACTIVE">{t('applicationsActive') || 'Active'}</option>
                  <option value="INACTIVE">{t('applicationsInactive') || 'Inactive'}</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  {t('applicationImage') || 'App Image'}
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 hover:border-[#FF6B35] hover:bg-orange-50 transition-colors"
                >
                  {imagePreview ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200">
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">Click to upload image (JPEG, PNG, WEBP)</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#ef5a23] disabled:opacity-60"
                >
                  {submitting ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
