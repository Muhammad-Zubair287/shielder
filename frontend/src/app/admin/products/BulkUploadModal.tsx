'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';

interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string; sku?: string }[];
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ onClose, onSuccess }: Props) {
  const { t, isRTL } = useLanguage();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag & Drop handlers ───────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) {
      setFile(dropped);
      setResult(null);
    } else if (dropped) {
      toast.error(t('bulkUploadInvalidFile'));
    }
  }, [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
      setResult(null);
    } else if (selected) {
      toast.error(t('bulkUploadInvalidFile'));
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const isValidFile = (f: File) =>
    f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    f.type === 'text/csv' ||
    f.name.endsWith('.xlsx') ||
    f.name.endsWith('.csv');

  const removeFile = () => {
    setFile(null);
    setResult(null);
  };

  // ── Download template ──────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await adminService.downloadProductTemplate();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('bulkTemplateDownloaded'));
    } catch {
      toast.error(t('bulkTemplateError'));
    } finally {
      setDownloading(false);
    }
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await adminService.bulkUpload(file);
      const data: BulkUploadResult = res.data.data || res.data;
      setResult(data);
      if (data.success > 0) {
        toast.success(t('bulkUploadSuccess').replace('{n}', String(data.success)));
        onSuccess();
      }
      if (data.failed > 0) {
        toast.error(t('bulkUploadPartialFail').replace('{n}', String(data.failed)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('bulkUploadError'));
    } finally {
      setUploading(false);
    }
  };

  // ── Template column reference ──────────────────────────────────────────────
  const templateColumns = [
    'Product Name *',
    'Arabic Name',
    'SKU',
    'Price *',
    'Stock *',
    'Minimum Stock',
    'Category Name *',
    'Subcategory Name *',
    'Brand Name',
    'Description',
    'Arabic Description',
    'Image',
    'spec_Color',
    'spec_Material',
    'spec_Size',
  ];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5B5FC7]/10 rounded-xl">
              <FileSpreadsheet size={22} className="text-[#5B5FC7]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{t('bulkUploadTitle')}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{t('bulkUploadSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Step 1 — Download template ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-800 text-sm">{t('bulkStep1Title')}</p>
                <p className="text-blue-600 text-xs mt-0.5 mb-3">{t('bulkStep1Desc')}</p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {downloading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  {t('downloadTemplate')}
                </button>
              </div>
            </div>
          </div>

          {/* ── Template columns reference ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('bulkTemplateColumns')}</p>
            <div className="flex flex-wrap gap-2">
              {templateColumns.map((col) => (
                <span
                  key={col}
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    col.endsWith('*')
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{t('bulkRequiredNote')}</p>
            <p className="text-xs text-blue-500 mt-1">
              <span className="font-semibold">Image</span> column: enter a filename (e.g. <code className="bg-blue-50 px-1 rounded">spare parts.jpeg</code>) from the products images folder, a relative path like <code className="bg-blue-50 px-1 rounded">images/products images/spare parts.jpeg</code>, or a full URL.
            </p>
          </div>

          {/* ── Step 2 — Drop zone ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FF6B35] text-white text-xs font-bold">2</span>
              <p className="font-semibold text-gray-700 text-sm">{t('bulkStep2Title')}</p>
            </div>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#5B5FC7] bg-[#5B5FC7]/5 scale-[1.01]'
                    : 'border-gray-200 hover:border-[#5B5FC7] hover:bg-[#5B5FC7]/5'
                }`}
              >
                <Upload size={32} className="text-gray-300 mb-3" />
                <p className="font-semibold text-gray-600 text-sm">{t('bulkDropZoneTitle')}</p>
                <p className="text-gray-400 text-xs mt-1">{t('bulkDropZoneDesc')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileSpreadsheet size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-sm">{file.name}</p>
                    <p className="text-green-600 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('removeFile')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Results panel ── */}
          {result && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Summary */}
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-black text-gray-800">{result.total}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('bulkTotal')}</p>
                </div>
                <div className="p-4 text-center bg-green-50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <p className="text-2xl font-black text-green-600">{result.success}</p>
                  </div>
                  <p className="text-xs text-green-500">{t('bulkSucceeded')}</p>
                </div>
                <div className="p-4 text-center bg-red-50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <XCircle size={16} className="text-red-400" />
                    <p className="text-2xl font-black text-red-500">{result.failed}</p>
                  </div>
                  <p className="text-xs text-red-400">{t('bulkFailed')}</p>
                </div>
              </div>

              {/* Error list */}
              {result.errors.length > 0 && (
                <div className="border-t border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <p className="text-xs font-semibold text-gray-600">{t('bulkErrors')}</p>
                  </div>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg">
                        <span className="font-semibold">{t('bulkRow')} {err.row}</span>
                        {err.sku && <span className="text-red-400"> (SKU: {err.sku})</span>}
                        {' — '}
                        {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── Footer buttons ── */}
          <div className={`flex gap-3 pt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-[#5B5FC7] hover:bg-[#4a4fb3] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('bulkUploading')}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {t('bulkUploadButton')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
