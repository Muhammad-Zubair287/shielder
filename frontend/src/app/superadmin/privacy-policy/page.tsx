'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import privacyPolicyService from '@/services/privacyPolicy.service';

// Use dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-xl border border-gray-200" />
});
import 'react-quill/dist/quill.snow.css';

const QUILL_CSS = `
  .quill-wrapper {
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    background: white;
  }
  .quill-wrapper .ql-toolbar.ql-snow {
    border: none !important;
    border-bottom: 1px solid #f1f5f9 !important;
    background-color: #f8fafc !important;
    padding: 12px !important;
  }
  .quill-wrapper .ql-container.ql-snow {
    border: none !important;
    min-height: 320px;
    font-size: 14px;
    color: #334155;
  }
  /* Hide any potential ghost toolbars or double borders from nested styles */
  .quill-wrapper .ql-toolbar + .ql-toolbar {
    display: none !important;
  }
  /* RTL specific overrides to fix icon alignment */
  [dir="rtl"] .quill-wrapper .ql-snow .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) {
    width: 60px !important;
  }
  [dir="rtl"] .quill-wrapper .ql-picker-label {
    padding-left: 18px !important;
    padding-right: 4px !important;
    text-align: right !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }
  [dir="rtl"] .quill-wrapper .ql-picker-options {
    right: 0 !important;
    left: auto !important;
  }
  [dir="rtl"] .quill-wrapper .ql-snow .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) svg {
    left: 2px !important;
    right: auto !important;
  }
`;

export default function PrivacyPolicyManagement() {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const { data } = await privacyPolicyService.getPublicPolicy();
      if (data.success && data.data) {
        setContentEn(data.data.contentEn || '');
        setContentAr(data.data.contentAr || '');
      }
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contentEn || !contentAr) {
      toast.error(t('error'));
      return;
    }

    setSaving(true);
    try {
      const { data } = await privacyPolicyService.updatePolicy({
        contentEn,
        contentAr
      });
      if (data.success) {
        toast.success(t('policyUpdated'));
      } else {
        toast.error(data.message || t('policyFailed'));
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast.error(t('policyFailed'));
    } finally {
      setSaving(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F97216]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{QUILL_CSS}</style>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F97216]/10 rounded-xl flex items-center justify-center">
            <Shield className="text-[#F97216]" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0A1E36]">{t('privacyPolicyManagement')}</h1>
            <p className="text-sm text-gray-500">{t('privacyPolicySubtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#F97216] text-white rounded-xl font-semibold hover:bg-[#F97216]/90 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
          {t('savePolicy')}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* English Version */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <span className="text-lg font-bold text-[#0A1E36]">{t('englishPolicy')}</span>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">EN</span>
          </div>
          <div className="quill-wrapper">
            <ReactQuill
              theme="snow"
              value={contentEn}
              onChange={setContentEn}
              modules={quillModules}
              className="h-96 mb-12"
              placeholder="Write privacy policy in English..."
            />
          </div>
        </div>

        {/* Arabic Version */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <span className="text-lg font-bold text-[#0A1E36]">{t('arabicPolicy')}</span>
            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AR</span>
          </div>
          <div className="quill-wrapper" dir="rtl">
            <ReactQuill
              theme="snow"
              value={contentAr}
              onChange={setContentAr}
              modules={quillModules}
              className="h-96 mb-12"
              placeholder="اكتب سياسة الخصوصية باللغة العربية..."
            />
          </div>
        </div>
      </div>
      
      {/* Visual Tip */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-blue-700 leading-relaxed italic">
          Tip: Content saved here will be immediately visible on the customer end <strong>/privacy-policy</strong> page. Please ensure you preview the layout.
        </p>
      </div>
    </div>
  );
}
