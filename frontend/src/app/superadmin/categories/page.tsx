'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  RefreshCcw, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Upload,
  Loader2,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/helpers';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';

// --- Types ---
interface Category {
  id: string;
  name: string;
  description: string;
  nameEn?: string;
  descriptionEn?: string;
  nameAr?: string;
  descriptionAr?: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    subcategories: number;
    products: number;
  };
}

interface SummaryData {
  totalCategories: number;
  activeCategories: number;
  disabledCategories: number;
}

// --- Components ---

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
    isActive 
      ? 'bg-[#E8F5E9] text-[#16A34A]' 
      : 'bg-[#FFEBEE] text-[#DC2626]'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
    {isActive ? 'Active' : 'Disabled'}
  </span>
);

export default function CategoryManagementPage() {
  const { t, isRTL } = useLanguage();
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalCategories: 0,
    activeCategories: 0,
    disabledCategories: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    totalPages: 1,
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    nameEn: '',
    descriptionEn: '',
    nameAr: '',
    descriptionAr: '',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [categoriesRes, summaryRes] = await Promise.all([
        adminService.getCategories({
          page: pagination.page,
          limit: pagination.limit,
          search,
          isActive: statusFilter === '' ? undefined : statusFilter === 'ACTIVE'
        }),
        adminService.getCategorySummary()
      ]);
      
      setCategories(categoriesRes.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: categoriesRes.data.pagination?.total || 0,
        pages: categoriesRes.data.pagination?.totalPages || categoriesRes.data.pagination?.pages || 1
      }));
      setSummary(summaryRes.data.data || { totalCategories: 0, activeCategories: 0, disabledCategories: 0 });
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.message || t('fetchCategoriesFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, statusFilter]);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return toast.error('Only JPG, PNG and WEBP are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        return toast.error('Image size must be less than 5MB');
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameEn) return toast.error(t('nameEnRequired'));
    if (!imageFile) return toast.error(t('imageRequired'));

    const data = new FormData();
    data.append('nameEn', formData.nameEn);
    data.append('descriptionEn', formData.descriptionEn);
    if (formData.nameAr) data.append('nameAr', formData.nameAr);
    if (formData.descriptionAr) data.append('descriptionAr', formData.descriptionAr);
    data.append('isActive', String(formData.isActive));
    data.append('image', imageFile);

    try {
      setFormLoading(true);
      await adminService.createCategory(data);
      toast.success(t('categoryCreated'));
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('categoryCreateFailed'));
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const data = new FormData();
    if (formData.nameEn) data.append('nameEn', formData.nameEn);
    if (formData.descriptionEn) data.append('descriptionEn', formData.descriptionEn);
    if (formData.nameAr) data.append('nameAr', formData.nameAr);
    if (formData.descriptionAr) data.append('descriptionAr', formData.descriptionAr);
    data.append('isActive', String(formData.isActive));
    if (imageFile) data.append('image', imageFile);

    try {
      setFormLoading(true);
      await adminService.updateCategory(selectedCategory.id, data);
      toast.success(t('categoryUpdated'));
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('categoryUpdateFailed'));
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    if (selectedCategory._count.subcategories > 0 || selectedCategory._count.products > 0) {
      setShowDeleteModal(false);
      setShowWarningModal(true);
      return;
    }

    try {
      setFormLoading(true);
      await adminService.deleteCategory(selectedCategory.id);
      toast.success(t('categoryDeleted'));
      setShowDeleteModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('categoryDeleteFailed'));
    } finally {
      setFormLoading(false);
    }
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCategories = () => {
    const visibleIds = categories.map((cat) => cat.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCategoryIds.includes(id));

    if (allSelected) {
      setSelectedCategoryIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedCategoryIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;

    setShowBulkDeleteModal(true);
  };

  const executeBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;

    try {
      setFormLoading(true);
      const response = await adminService.bulkDeleteCategories(selectedCategoryIds);
      const result = response.data?.data;
      const deletedCount = result?.deletedCount || 0;
      const failedCount = result?.failed?.length || 0;

      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} categories`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} categories could not be deleted`);
      }

      setShowBulkDeleteModal(false);
      setSelectedCategoryIds([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('categoryDeleteFailed'));
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nameEn: '',
      descriptionEn: '',
      nameAr: '',
      descriptionAr: '',
      isActive: true
    });
    setImageFile(null);
    setImagePreview(null);
    setSelectedCategory(null);
  };

  const openEditModal = (cat: Category) => {
    setSelectedCategory(cat);
    setFormData({
      nameEn: cat.nameEn || cat.name || '',
      descriptionEn: cat.descriptionEn || cat.description || '',
      nameAr: cat.nameAr || '',
      descriptionAr: cat.descriptionAr || '',
      isActive: cat.isActive
    });
    setImagePreview(getImageUrl(cat.image));
    setShowEditModal(true);
  };

  // --- Render ---

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0205A6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1E36]">{t('categoriesTitle')}</h1>
          <p className="text-gray-500 text-sm italic font-medium">{t('categoriesSubtitle')}</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B35] text-white rounded-[10px] hover:bg-[#FF5722] transition-all font-semibold shadow-md active:scale-95"
        >
          <Plus size={18} />
          {t('addCategory')}
        </button>
        {selectedCategoryIds.length > 0 && (
          <button
            onClick={handleBulkDeleteCategories}
            disabled={formLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#DC2626] text-white rounded-[10px] hover:bg-[#B91C1C] transition-all font-semibold shadow-md disabled:opacity-50"
          >
            <Trash2 size={18} />
            {`Bulk Delete (${selectedCategoryIds.length})`}
          </button>
        )}
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: t('totalCategories'), value: summary.totalCategories, icon: FolderTree, color: '#0205A6' },
          { label: t('activeCategories'), value: summary.activeCategories, icon: CheckCircle2, color: '#16A34A' },
          { label: t('disabledCategories'), value: summary.disabledCategories, icon: X, color: '#DC2626' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
              <h3 className="text-3xl font-black text-[#0A1E36] mt-1">{card.value}</h3>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${card.color}15` }}>
              <card.icon size={24} style={{ color: card.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('searchCategories')}
              dir="ltr"
              className="input-ltr w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
             <select 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0205A6] text-sm appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="ACTIVE">{t('activeOnly')}</option>
              <option value="DISABLED">{t('disabledOnly')}</option>
            </select>
          </div>
          <button 
            onClick={() => { setSearch('');setStatusFilter(''); }}
            className="p-2.5 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-colors border border-gray-200"
            title="Refresh"
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4. Main Table */}
      <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && categories.every((cat) => selectedCategoryIds.includes(cat.id))}
                    onChange={toggleSelectAllCategories}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#0205A6] focus:ring-[#0205A6]"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('imageCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('categoryName')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('categoryDescription')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('dataCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('createdAt')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.length > 0 ? categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategorySelection(cat.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#0205A6] focus:ring-[#0205A6]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                        {cat.image ? (
                          <img 
                            src={getImageUrl(cat.image) || ''}
                            alt={cat.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                          />
                        ) : <ImageIcon className="text-gray-300" size={20} />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#0A1E36]">{cat.name}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-gray-500 truncate">{cat.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{t('subCount')}: {cat._count.subcategories}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{t('proCount')}: {cat._count.products}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge isActive={cat.isActive} />
                  </td>
                  <td className="px-6 py-4 text-[11px] text-gray-500 font-medium">
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(cat)}
                        className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedCategory(cat); setShowDeleteModal(true); }}
                        className="p-2 text-gray-400 hover:text-[#DC2626] hover:bg-[#DC2626]/5 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 italic text-sm">
                    {t('noCategories')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <UnifiedPagination
          page={pagination.page}
          totalPages={pagination.totalPages || pagination.pages || 1}
          totalItems={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          labels={{
            total: 'Total',
            results: 'entries',
            previous: 'Previous',
            next: 'Next',
          }}
        />
      </div>

      {/* --- Modals --- */}

      {/* 5. BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border-b-8 border-[#DC2626]">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-[#0A1E36] mb-3 uppercase tracking-tight">Bulk Delete Categories</h2>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-8">
              <p className="text-gray-600 text-xs leading-relaxed">
                You are about to remove <b className="text-[#DC2626]">{selectedCategoryIds.length}</b> selected categories. This action is irreversible.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkDeleteCategories}
                disabled={formLoading}
                className="flex-1 px-4 py-3 bg-[#DC2626] text-white rounded-xl hover:bg-red-700 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {formLoading && <Loader2 className="animate-spin" size={16} />}
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD/EDIT MODAL */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 text-[#0A1E36] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-[#FF6B35] text-white`}>
                  {showAddModal ? <Plus size={20} /> : <Edit2 size={20} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{showAddModal ? t('addCategory') : t('editCategory')}</h2>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Inventory Classification</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <form ref={formRef} onSubmit={showAddModal ? handleCreateCategory : handleUpdateCategory} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
              {/* Image Upload */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <div className="p-3 bg-white rounded-full shadow-sm text-gray-400 group-hover:text-[#0205A6] transition-colors">
                        <Upload size={24} />
                      </div>
                      <p className="mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('clickToUpload')}</p>
                      <p className="text-[8px] text-gray-400 italic mt-0.5">{t('imageHint')}</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <p className="text-white text-[10px] font-black uppercase tracking-widest">{t('changeImage')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{t('nameEn')} <span className="text-[#DC2626]">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Earthmoving Equipment"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{t('descriptionEn')} <span className="text-[#DC2626]">*</span></label>
                <textarea
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm font-medium resize-none"
                  placeholder="English description..."
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({...formData, descriptionEn: e.target.value})}
                />
              </div>

              {/* Arabic fields */}
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('arabicSection')}</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="space-y-4" dir="rtl">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 text-right">اسم الفئة</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:bg-white focus:outline-none transition-all text-sm font-medium"
                      placeholder="مثال: معدات الحفر"
                      value={formData.nameAr}
                      onChange={(e) => setFormData({...formData, nameAr: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 text-right">الوصف</label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:bg-white focus:outline-none transition-all text-sm font-medium resize-none"
                      placeholder="وصف الفئة بالعربية..."
                      value={formData.descriptionAr}
                      onChange={(e) => setFormData({...formData, descriptionAr: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                   <p className="text-xs font-bold text-[#0A1E36]">{t('active')}</p>
                   <p className="text-[10px] text-gray-500 italic">{t('toggleVisibility')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isActive ? 'bg-[#16A34A]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className={`flex-1 px-4 py-3 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${showAddModal ? 'bg-[#FF6B35] hover:bg-[#FF5722]' : 'bg-[#FF6B35] hover:bg-[#FF5722]'}`}
                >
                  {formLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {showAddModal ? t('addCategory') : t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-sm rounded-[24px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border-b-8 border-[#DC2626]">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-[#0A1E36] mb-3 uppercase tracking-tight">{t('deleteCategory')}</h2>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-8">
              <p className="text-gray-600 text-xs leading-relaxed">
                You are about to remove <b className="text-[#DC2626]">{selectedCategory?.name}</b>. This action is irreversible.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                {t('noCancel')}
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={formLoading}
                className="flex-1 px-4 py-3 bg-[#DC2626] text-white rounded-xl hover:bg-red-700 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {formLoading && <Loader2 className="animate-spin" size={16} />}
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. WARNING MODAL (Can't delete due to relations) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border-b-8 border-[#FACC15]">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#FACC15]/10 text-[#FACC15] flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-[#0A1E36] mb-3 uppercase tracking-tight">{t('deletionBlocked')}</h2>
            <p className="text-gray-500 text-sm mb-2 font-medium">This category cannot be deleted yet.</p>
            <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 mb-8 text-left">
              <p className="text-gray-700 text-xs leading-relaxed mb-3">
                System check revealed that <b>{selectedCategory?.name}</b> contains:
              </p>
              <ul className="text-[11px] font-bold text-gray-500 space-y-1 ml-2">
                <li className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                   {selectedCategory?._count.subcategories} Subcategories
                </li>
                <li className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                   {selectedCategory?._count.products} Products
                </li>
              </ul>
              <p className="text-gray-400 text-[10px] italic mt-4 italic">
                Please reassign or remove these items before attempting to delete this category.
              </p>
            </div>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full px-4 py-3 bg-[#0A1E36] text-white rounded-xl hover:bg-black font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
            >
              {t('iUnderstand')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
