'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Package, 
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
  ChevronRight,
  Filter,
  Eye,
  Check,
  XCircle,
  MoreVertical,
  Image as ImageIcon,
  DollarSign,
  Layers,
  User as UserIcon,
} from 'lucide-react';
import SARSymbol from '@/components/SARSymbol';
import Image from 'next/image';
import adminService from '@/services/admin.service';
import settingsService from '@/services/settings.service';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/helpers';
import { ApiErrorResponse } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';

// --- Types ---
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  minimumStockThreshold: number;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
  isActive: boolean;
  mainImage: string | null;
  categoryName: string;
  subcategoryName: string;
  supplierName: string;
  categoryId: string;
  subcategoryId: string;
  supplierId: string | null;
  createdAt: string;
  specifications: { id: string; specKey: string; specValue: string }[];
}

interface SpecTemplate {
  id: string;
  specKey: string;
  isRequired: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Supplier {
  id: string;
  fullName: string;
  email: string;
}

const sortByStockPriority = (items: Product[]): Product[] => {
  return [...items].sort((a, b) => {
    const aThreshold = Number.isFinite(a.minimumStockThreshold) ? a.minimumStockThreshold : 0;
    const bThreshold = Number.isFinite(b.minimumStockThreshold) ? b.minimumStockThreshold : 0;

    const aRank = a.stock <= 0 ? 0 : a.stock <= aThreshold ? 1 : 2;
    const bRank = b.stock <= 0 ? 0 : b.stock <= bThreshold ? 1 : 2;

    if (aRank !== bRank) return aRank - bRank;
    if (a.stock !== b.stock) return a.stock - b.stock;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
};

const ProductManagement = () => {
  const { t, isRTL } = useLanguage();
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    activeProducts: 0,
    pendingApproval: 0,
    lowStockProducts: 0
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  
  // Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Bulk State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; sku?: string; error: string }>;
  } | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number>(5);
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    description: string;
    categoryId: string;
    subcategoryId: string;
    supplierId: string;
    price: string;
    stock: string;
    minimumStockThreshold: string;
    isActive: boolean;
    specifications: { specKey: string; specValue: string; isRequired?: boolean }[];
  }>({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    supplierId: '',
    price: '',
    stock: '',
    minimumStockThreshold: '5',
    isActive: true,
    specifications: [],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load global low-stock threshold from system settings for product form defaults
  useEffect(() => {
    let mounted = true;
    settingsService
      .getSettings()
      .then((res: any) => {
        if (!mounted) return;
        const threshold = res?.data?.data?.lowStockThreshold;
        if (typeof threshold === 'number' && Number.isFinite(threshold)) {
          setDefaultLowStockThreshold(threshold);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [productsRes, summaryRes, catsRes, suppliersRes] = await Promise.all([
        adminService.getProductsForManagement({
          page: pagination.page,
          limit: pagination.limit,
          search,
          categoryId: categoryFilter || undefined,
          subcategoryId: subcategoryFilter || undefined,
          supplierId: supplierFilter || undefined,
          status: statusFilter || undefined,
        }),
        adminService.getProductSummary(),
        adminService.getCategories({ limit: 100 }),
        adminService.getUsers({ role: 'SUPPLIER', limit: 100 })
      ]);
      
      setProducts(sortByStockPriority(productsRes.data.products || []));
      setPagination(prev => ({
        ...prev,
        total: productsRes.data.pagination?.total || 0,
        pages: productsRes.data.pagination?.totalPages || 1
      }));
      setSummary(summaryRes.data.data || { totalProducts: 0, activeProducts: 0, pendingApproval: 0, lowStockProducts: 0 });
      
      // Map Categories
      const catData = catsRes.data.data?.data || catsRes.data.data || [];
      setCategories(catData.map((c: { id: string, name?: string, translations?: { name: string }[] }) => ({
        id: c.id,
        name: c.name || (c.translations && c.translations[0]?.name) || 'Unnamed'
      })));

      // Map Suppliers
      const supData = suppliersRes.data.data?.users || suppliersRes.data.data || [];
      setSuppliers(supData.map((s: { id: string, email: string, profile?: { fullName: string } }) => ({
        id: s.id,
        fullName: s.profile?.fullName || s.email,
        email: s.email
      })));

    } catch (err) {
      const error = err as ApiErrorResponse;
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.message || 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, categoryFilter, subcategoryFilter, supplierFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, categoryFilter, subcategoryFilter, supplierFilter, statusFilter]);
  // Fetch subcategories when category filter changes (only when modal is not open)
  useEffect(() => {
    if (showAddEditModal) return; // Don't update when form modal is open
    const fetchSubs = async () => {
      if (categoryFilter) {
        try {
          const res = await adminService.getSubcategories({ categoryId: categoryFilter, limit: 100 });
          const subData = res.data.data || [];
          setSubcategories(subData.map((s: { id: string, name?: string, translations?: { name: string }[], categoryId: string }) => ({
            id: s.id,
            name: s.name || (s.translations && s.translations[0]?.name) || 'Unnamed',
            categoryId: s.categoryId
          })));
        } catch (error) {
          console.error('Failed to fetch subcategories', error);
        }
      } else {
        setSubcategories([]);
      }
    };
    fetchSubs();
  }, [categoryFilter, showAddEditModal]);

  // Load subcategories for form when modal opens/category changes
  useEffect(() => {
    const fetchFormSubcategories = async () => {
      if (formData.categoryId) {
        try {
          const res = await adminService.getSubcategories({ categoryId: formData.categoryId, limit: 100 });
          const subData = res.data.data || [];
          setSubcategories(subData.map((s: { id: string, name?: string, translations?: { name: string }[], categoryId: string }) => ({
            id: s.id,
            name: s.name || (s.translations && s.translations[0]?.name) || 'Unnamed',
            categoryId: s.categoryId
          })));
        } catch (error) {
          console.error('Failed to fetch subcategories for form', error);
        }
      } else {
        setSubcategories([]);
      }
    };
    if (showAddEditModal && formData.categoryId) {
      fetchFormSubcategories();
    }
  }, [formData.categoryId, showAddEditModal]);

  // Load Templates when form category/subcategory changes
  useEffect(() => {
    const loadTemplates = async () => {
      if (formData.categoryId) {
        try {
          const res = await adminService.getSpecTemplates(formData.categoryId, formData.subcategoryId || undefined);
          const templates: SpecTemplate[] = res.data.data || [];
          
          if (!isEditing) {
            setFormData(prev => ({
              ...prev,
              specifications: templates.map(t => ({
                specKey: t.specKey,
                specValue: '',
                isRequired: t.isRequired
              }))
            }));
          }
        } catch (error) {
          console.error('Failed to load spec templates', error);
        }
      }
    };
    if (showAddEditModal && !isEditing) {
        loadTemplates();
    }
  }, [formData.categoryId, formData.subcategoryId, showAddEditModal, isEditing]);

  // Handle Form Actions
  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      supplierId: '',
      price: '',
      stock: '',
      minimumStockThreshold: String(defaultLowStockThreshold),
      isActive: true,
      specifications: [],
    });
    setImagePreview(null);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setSelectedProduct(null);
    setIsEditing(false);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jfif'].includes(file.type)) {
      toast.error('Invalid image type. Use JPG, PNG, or WEBP.');
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

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || !formData.subcategoryId || !formData.price || !formData.stock) {
      return toast.error('Please fill all required fields');
    }

    // Validate Required Specs
    const missingSpecs = formData.specifications.filter(s => s.isRequired && !s.specValue.trim());
    if (missingSpecs.length > 0) {
      return toast.error(`Please fill required specification: ${missingSpecs[0].specKey}`);
    }

    // Check for duplicate keys
    const keys = formData.specifications.map(s => s.specKey.toLowerCase().trim());
    const hasDuplicates = keys.some((k, idx) => keys.indexOf(k) !== idx);
    if (hasDuplicates) {
      return toast.error('Duplicate specification keys are not allowed');
    }

    const payload: Record<string, any> = {
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      minimumStockThreshold: parseInt(formData.minimumStockThreshold),
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId,
      isActive: formData.isActive,
      translations: [
        { locale: 'en', name: formData.name, description: formData.description }
      ],
      specifications: formData.specifications
        .filter(s => s.specKey.trim() && s.specValue.trim())
        .map(s => ({ specKey: s.specKey.trim(), specValue: s.specValue.trim() }))
    };

    // Joi optional string/uuid fields should be omitted when empty, not sent as null.
    if (formData.sku?.trim()) payload.sku = formData.sku.trim();
    if (formData.supplierId) payload.supplierId = formData.supplierId;

    try {
      setFormLoading(true);
      let productId = selectedProduct?.id;

      if (isEditing && selectedProduct) {
        await adminService.updateProduct(selectedProduct.id, payload);
      } else {
        const created = await adminService.createProduct(payload);
        productId = created?.data?.data?.id;
      }

      if (imageFile && productId) {
        await adminService.uploadProductImage(productId, imageFile);
      }

      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
      setShowAddEditModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      const firstValidationError = error.response?.data?.errors?.[0]?.message;
      toast.error(firstValidationError || error.response?.data?.message || 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      setFormLoading(true);
      await adminService.deleteProduct(selectedProduct.id);
      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.message || 'Failed to delete product');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = () => {
    const visibleIds = products.map((product) => product.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedProductIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;

    setShowBulkDeleteModal(true);
  };

  const executeBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;

    try {
      setFormLoading(true);
      const response = await adminService.bulkDeleteProducts(selectedProductIds);
      const result = response.data?.data;
      const deletedCount = result?.deletedCount || 0;
      const failedCount = result?.failed?.length || 0;

      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} products`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} products could not be deleted`);
      }

      setShowBulkDeleteModal(false);
      setSelectedProductIds([]);
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.message || 'Failed to bulk delete products');
    } finally {
      setFormLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setSupplierFilter('');
  };

  const handleApprove = async () => {
    if (!selectedProduct) return;
    try {
      setFormLoading(true);
      await adminService.approveProduct(selectedProduct.id);
      toast.success('Product approved');
      setShowApproveModal(false);
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.message || 'Failed to approve product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminService.downloadProductTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return toast.error('Please select a file');

    try {
      setBulkUploading(true);
      const res = await adminService.bulkUpload(bulkFile);
      setBulkResults(res.data.data);
      if (res.data.data.failed === 0) {
        toast.success(`Successfully uploaded ${res.data.data.success} products`);
      } else {
        toast.error(`Uploaded with errors. Failed: ${res.data.data.failed}`);
      }
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      toast.error(error.response?.data?.message || 'Failed to upload products');
    } finally {
      setBulkUploading(false);
    }
  };

  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setFormData({
      sku: p.sku || '',
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId,
      supplierId: p.supplierId || '',
      price: p.price,
      stock: p.stock.toString(),
      minimumStockThreshold: p.minimumStockThreshold.toString(),
      isActive: p.isActive,
      specifications: p.specifications?.map(s => ({
        specKey: s.specKey,
        specValue: s.specValue
      })) || [],
    });
    setImagePreview(p.mainImage);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setIsEditing(true);
    setShowAddEditModal(true);
  };

  // UI Helpers
  const StatusBadge = ({ status, isActive }: { status: string, isActive: boolean }) => {
    if (!isActive) return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Inactive</span>;
    
    switch (status) {
      case 'PUBLISHED': return <span className="px-2 py-1 bg-[#16A34A]/10 text-[#16A34A] rounded-full text-[10px] font-bold uppercase tracking-wider">Approved</span>;
      case 'PENDING': return <span className="px-2 py-1 bg-[#FACC15]/10 text-[#FACC15] rounded-full text-[10px] font-bold uppercase tracking-wider">Pending</span>;
      case 'REJECTED': return <span className="px-2 py-1 bg-[#DC2626]/10 text-[#DC2626] rounded-full text-[10px] font-bold uppercase tracking-wider">Rejected</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const StockBadge = ({ stock, threshold }: { stock: number, threshold: number }) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-[#DC2626]/10 text-[#B91C1C] border border-[#DC2626]/20 rounded-full text-[11px] font-bold tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
          Out of stock
        </span>
      );
    }

    if (stock <= threshold) {
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-[#FACC15]/15 text-[#8A6700] border border-[#FACC15]/30 rounded-full text-[11px] font-bold tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Low stock
        </span>
      );
    }

    return <span className="text-gray-600 text-xs font-semibold whitespace-nowrap">{stock} units</span>;
  };

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0205A6]"></div>
        <p className="text-[#0A1E36] font-bold animate-pulse">{t('initializingInventory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A1E36] tracking-tight">{t('productMgmtTitle')}</h1>
          <p className="text-gray-500 text-sm italic font-medium">{t('productMgmtSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedProductIds.length > 0 && (
            <button
              onClick={handleBulkDeleteProducts}
              disabled={formLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#DC2626] text-white rounded-[10px] hover:bg-[#B91C1C] transition-all font-semibold shadow-md disabled:opacity-50"
            >
              <Trash2 size={18} />
              {`Bulk Delete (${selectedProductIds.length})`}
            </button>
          )}
          <button 
            onClick={() => fetchData()}
            className="p-2.5 text-gray-500 hover:text-[#0205A6] bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all active:scale-95"
            title={t('refreshBtn')}
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => { setBulkFile(null); setBulkResults(null); setShowBulkModal(true); }}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-[10px] hover:bg-slate-50 transition-all font-semibold shadow-sm active:scale-95"
          >
            <Upload size={18} />
            {t('bulkUpload')}
          </button>
          <button 
            onClick={() => { resetForm(); setShowAddEditModal(true); }}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#FF6B35] text-white rounded-[10px] hover:bg-[#FF5722] transition-all font-semibold shadow-md active:scale-95"
          >
            <Plus size={18} />
            {t('addProduct')}
          </button>
        </div>
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('totalProducts'), value: summary.totalProducts, icon: Package, color: '#0A1E36' },
          { label: t('activeProducts'), value: summary.activeProducts, icon: CheckCircle2, color: '#16A34A' },
          { label: t('pendingApproval'), value: summary.pendingApproval, icon: AlertTriangle, color: '#FACC15' },
          { label: t('lowStockProducts'), value: summary.lowStockProducts, icon: Layers, color: summary.lowStockProducts > 0 ? '#DC2626' : '#16A34A' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all duration-300">
            <div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">{card.label}</p>
              <h3 className="text-3xl font-black text-[#0A1E36]">{card.value}</h3>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${card.color}10` }}>
              <card.icon size={28} style={{ color: card.color }} className="group-hover:scale-110 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Search & Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0205A6] transition-colors" size={18} />
            <input
              type="text"
              placeholder={t('searchProducts')}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
             <select 
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0205A6] text-sm font-semibold text-[#0A1E36]"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setSubcategoryFilter(''); }}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select 
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0205A6] text-sm font-semibold text-[#0A1E36] disabled:opacity-50"
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
              disabled={!categoryFilter}
            >
              <option value="">{categoryFilter ? t('allSubcategories') : t('selectCategoryFirst')}</option>
              {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select 
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0205A6] text-sm font-semibold text-[#0A1E36]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="PUBLISHED">{t('approved')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="REJECTED">{t('rejected')}</option>
            </select>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
              {t('clearFilters') || 'Clear Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Product Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && products.every((prod) => selectedProductIds.includes(prod.id))}
                    onChange={toggleSelectAllProducts}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#0205A6] focus:ring-[#0205A6]"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('productCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('categorySubCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('supplierLabel')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('productPrice')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('stockCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.length > 0 ? products.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 text-center align-top">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(prod.id)}
                      onChange={() => toggleProductSelection(prod.id)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-[#0205A6] focus:ring-[#0205A6]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center shadow-sm relative">
                        {prod.mainImage ? (
                          <Image 
                            src={getImageUrl(prod.mainImage) || ''}
                            alt={prod.name} 
                            className="object-cover"
                            fill
                          />
                        ) : <ImageIcon className="text-gray-300" size={24} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0A1E36] line-clamp-2 leading-snug">{prod.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {prod.sku && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">SKU: {prod.sku}</span>}
                          <span className="text-[10px] text-gray-400 font-medium">ID: {prod.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-black text-[#0205A6] uppercase tracking-tight">{prod.categoryName}</span>
                      <span className="text-[10px] font-bold text-gray-400 italic">{prod.subcategoryName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserIcon size={12} className="text-gray-400" />
                       </div>
                       <span className="text-xs font-semibold text-[#0A1E36]">{prod.supplierName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-[#0A1E36] text-sm">
                      {parseFloat(prod.price).toLocaleString()} <span className="text-[10px] text-gray-400 ml-0.5">SAR</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={prod.stock} threshold={prod.minimumStockThreshold} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={prod.status} isActive={prod.isActive} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === prod.id ? null : prod.id);
                        }}
                        className="p-2 text-gray-400 hover:text-[#0A1E36] hover:bg-gray-100 rounded-full transition-all"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {openMenuId === prod.id && (
                        <div className="absolute right-0 top-[80%] w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-[60] py-2 animate-in fade-in slide-in-from-top-2 zoom-in duration-200">
                          <button 
                            onClick={() => { setSelectedProduct(prod); setShowViewModal(true); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] transition-colors"
                          >
                            <Eye size={16} />
                            View Details
                          </button>
                          
                          <button 
                            onClick={() => { openEditModal(prod); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] transition-colors"
                          >
                            <Edit2 size={16} />
                            Edit Product
                          </button>

                          {prod.status === 'PENDING' && (
                            <button 
                              onClick={() => { setSelectedProduct(prod); setShowApproveModal(true); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#16A34A] hover:bg-[#16A34A]/5 transition-colors"
                            >
                              <Check size={16} />
                              Approve Product
                            </button>
                          )}

                          <div className="h-px bg-gray-50 my-1" />
                          
                          <button 
                            onClick={() => { setSelectedProduct(prod); setShowDeleteModal(true); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                          >
                            <Trash2 size={16} />
                            Delete Product
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-400 italic">
                      <Package size={48} className="opacity-20" />
                      <p className="text-sm">No products found matching your active filters.</p>
                      <button 
                        onClick={() => { setSearch(''); setCategoryFilter(''); setSubcategoryFilter(''); setSupplierFilter(''); setStatusFilter(''); }}
                        className="text-[#0205A6] text-xs font-bold underline not-italic uppercase tracking-widest mt-2"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        {(pagination.totalPages || pagination.pages || 1) > 1 && (
          <UnifiedPagination
            page={pagination.page}
            totalPages={pagination.totalPages || pagination.pages || 1}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            isRTL={isRTL}
          />
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 0. Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Bulk Upload Products</h3>
                <p className="text-xs text-slate-500 font-medium">Upload products via CSV or Excel file.</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-8 md:px-10">
              {!bulkResults ? (
                <div className="space-y-8">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                        <AlertTriangle size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-orange-900">Important Instructions</h4>
                        <p className="text-xs text-orange-700 leading-relaxed">
                          Please ensure your file matches the template exactly. Categories, subcategories, and brands must already exist in the system (English names).
                        </p>
                        <button 
                          onClick={handleDownloadTemplate}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <RefreshCcw size={14} />
                          Download Sample Template (.xlsx)
                        </button>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBulkUpload} className="space-y-6">
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`w-full py-12 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all ${
                        bulkFile ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <div className={`p-4 rounded-2xl mb-4 transition-all ${
                          bulkFile ? 'bg-[#FF6B35] text-white' : 'bg-white text-slate-400 shadow-sm'
                        }`}>
                          <Upload size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {bulkFile ? bulkFile.name : 'Choose a file or drag & drop'}
                        </p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Supports .CSV, .XLSX (Max 10MB)</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowBulkModal(false)}
                        className="flex-1 px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={bulkUploading || !bulkFile}
                        className="flex-[2] px-8 py-4 bg-[#FF6B35] text-white rounded-2xl font-bold text-sm hover:bg-[#FF5722] shadow-lg shadow-[#FF6B35]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {bulkUploading ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Processing Batch...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Uploading</span>
                            <ChevronRight size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                      <h4 className="text-2xl font-bold text-slate-900">{bulkResults.total}</h4>
                    </div>
                    <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Success</p>
                      <h4 className="text-2xl font-bold text-green-600">{bulkResults.success}</h4>
                    </div>
                    <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Failed</p>
                      <h4 className="text-2xl font-bold text-red-600">{bulkResults.failed}</h4>
                    </div>
                  </div>

                  {bulkResults.errors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-800 ml-1">Issues Found Per Row</h4>
                      <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/50">
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Row</th>
                              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU</th>
                              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Error Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkResults.errors.map((err, idx) => (
                              <tr key={idx} className="bg-white/50">
                                <td className="px-4 py-3 text-xs font-bold text-slate-600">{err.row}</td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-500">{err.sku || 'N/A'}</td>
                                <td className="px-4 py-3 text-xs text-red-500 font-medium">{err.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setBulkResults(null); setBulkFile(null); setShowBulkModal(false); }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Finish and Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 0. Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Bulk Delete Products</h3>
                <p className="text-xs text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                <p className="text-sm text-slate-700 leading-relaxed">
                  You are about to delete <b className="text-red-600">{selectedProductIds.length}</b> selected products.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkDeleteProducts}
                  disabled={formLoading}
                  className="flex-1 py-3 bg-[#DC2626] text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="animate-spin" size={16} />}
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Add/Edit Product Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Fill in the details to manage your inventory product.</p>
              </div>
              <button 
                onClick={() => setShowAddEditModal(false)} 
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="overflow-y-auto px-8 py-8 md:px-10">
              <div className="space-y-8">
                {/* Image Section */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative group">
                    <div className="w-44 h-44 rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-orange-500 group-hover:bg-orange-50/30 relative">
                      {imagePreview ? (
                        <Image src={getImageUrl(imagePreview) || imagePreview} className="object-cover transition-transform duration-500 group-hover:scale-105" alt="Preview" fill />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <ImageIcon className="mb-3 opacity-40" size={48} strokeWidth={1.5} />
                          <p className="text-[11px] font-bold uppercase tracking-widest">Product Image</p>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-3.5 bg-[#FF6B35] text-white rounded-2xl shadow-lg hover:bg-[#FF5722] hover:scale-110 active:scale-95 transition-all duration-200 border-4 border-white"
                    >
                      <Upload size={18} />
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/jfif"
                      className="hidden"
                      onChange={handleImagePick}
                    />
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em]">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  {/* Basic Info */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Product Name <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="e.g. Caterpillar Excavator 320 GC"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Description</label>
                    <textarea
                      rows={4}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter technical specifications and product features..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">SKU (Stock Keeping Unit)</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="e.g. CAT-320-GC-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Category <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-900 appearance-none cursor-pointer"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="rotate-90" size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Subcategory <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-900 appearance-none cursor-pointer disabled:opacity-50"
                        value={formData.subcategoryId}
                        onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                        disabled={!formData.categoryId}
                      >
                        <option value="">{formData.categoryId ? 'Select Subcategory' : 'First select a category'}</option>
                        {categories.find(c => c.id === formData.categoryId) && subcategories.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="rotate-90" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Supplier</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-900 appearance-none cursor-pointer"
                        value={formData.supplierId}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      >
                        <option value="">Direct Distribution (Admin)</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="rotate-90" size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Inventory Details */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Price (SAR) <span className="text-red-500">*</span></label>
                    <div className="relative group/input">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/input:text-blue-500" size={18} />
                       <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white outline-none font-semibold text-slate-900 placeholder:font-normal"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Initial Stock <span className="text-red-500">*</span></label>
                    <div className="relative group/input">
                      <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/input:text-blue-500" size={18} />
                      <input
                        required
                        type="number"
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white outline-none font-semibold text-slate-900 placeholder:font-normal"
                        placeholder="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>
                  </div>

                   <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-2 block ml-1">Low Stock Alert Threshold</label>
                    <div className="relative group/input">
                      <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/input:text-amber-500" size={18} />
                      <input
                        type="number"
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white outline-none font-semibold text-slate-900"
                        placeholder="5"
                        value={formData.minimumStockThreshold}
                        onChange={(e) => setFormData({ ...formData, minimumStockThreshold: e.target.value })}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400 font-medium ml-1">Receive a notification when stock falls below this level.</p>
                  </div>
                </div>

                {/* Dynamic Specifications Section */}
                <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-blue-600" />
                      <label className="text-sm font-bold text-slate-800 tracking-tight">Technical Specifications</label>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        specifications: [...prev.specifications, { specKey: '', specValue: '' }] 
                      }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-bold rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 shadow-sm"
                    >
                      <Plus size={14} />
                      Add Custom
                    </button>
                  </div>
                  
                  {formData.specifications.length > 0 ? (
                    <div className="space-y-3">
                      {formData.specifications.map((spec, idx) => (
                        <div key={idx} className="flex gap-3 items-center group/spec animate-in fade-in slide-in-from-top-1 duration-200">
                           <div className="flex-1">
                              <input 
                                placeholder="Key (e.g. Material)"
                                readOnly={spec.isRequired}
                                className={`w-full px-4 py-2.5 bg-white border ${spec.isRequired ? 'border-slate-100 text-slate-400 italic bg-slate-50/50' : 'border-slate-200 text-slate-700'} rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all`}
                                value={spec.specKey}
                                onChange={(e) => {
                                  const newSpecs = [...formData.specifications];
                                  newSpecs[idx].specKey = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                                }}
                              />
                           </div>
                           <div className="flex-[2]">
                              <input 
                                placeholder="Value (e.g. Stainless Steel)"
                                required={spec.isRequired}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                value={spec.specValue}
                                onChange={(e) => {
                                  const newSpecs = [...formData.specifications];
                                  newSpecs[idx].specValue = e.target.value;
                                  setFormData({ ...formData, specifications: newSpecs });
                                }}
                              />
                           </div>
                           {!spec.isRequired ? (
                             <button 
                               type="button"
                               onClick={() => {
                                  const newSpecs = formData.specifications.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, specifications: newSpecs });
                               }}
                               className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                               title="Remove Specification"
                             >
                               <Trash2 size={16} />
                             </button>
                           ) : (
                             <div className="p-2.5 text-amber-500 bg-amber-50 rounded-lg" title="Required System Specification">
                               <AlertTriangle size={16} />
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-[11px] text-slate-400 font-medium italic">No specific attributes defined for this selection.</p>
                    </div>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-5 bg-orange-50/30 rounded-3xl border border-orange-100/50">
                   <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-800">Publish Immediately</span>
                     <span className="text-[11px] text-slate-500 font-medium">Make this product visible to customers upon saving.</span>
                   </div>
                   <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isActive ? 'bg-[#FF6B35]' : 'bg-slate-200'}`}
                   >
                     <span
                       className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                     />
                   </button>
                </div>
              </div>

              {/* Form Footer Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-12 pb-4">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="order-2 sm:order-1 flex-1 px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 hover:text-slate-800 transition-all duration-200 active:scale-95 border border-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="order-1 sm:order-2 flex-[1.5] px-8 py-4 bg-[#FF6B35] text-white rounded-2xl font-bold text-sm hover:bg-[#FF5722] shadow-lg shadow-[#FF6B35]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 group"
                >
                  {formLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
                      <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Product Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A1E36]/90 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh]">
              {/* Left Side: Product Image Display */}
              <div className="md:w-1/2 bg-gray-100 relative">
                  {selectedProduct.mainImage ? (
                    <Image 
                      src={getImageUrl(selectedProduct.mainImage) || ''}
                      alt={selectedProduct.name}
                      className="object-cover" 
                      fill
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon size={100} strokeWidth={1} />
                      <p className="font-black uppercase tracking-widest text-[10px] mt-4">System Asset Preview Missing</p>
                    </div>
                  )}
                  <div className="absolute top-8 left-8">
                     <StatusBadge status={selectedProduct.status} isActive={selectedProduct.isActive} />
                  </div>
              </div>

              {/* Right Side: Detailed Info */}
              <div className="md:w-1/2 p-12 flex flex-col overflow-y-auto bg-white">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h2 className="text-3xl font-black text-[#0A1E36] tracking-tighter mb-2 leading-none uppercase italic">{selectedProduct.name}</h2>
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <Layers size={12} />
                         <span>{selectedProduct.categoryName} / {selectedProduct.subcategoryName}</span>
                      </div>
                   </div>
                   <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-[#DC2626] transition-colors">
                      <XCircle size={32} />
                   </button>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-2 gap-8">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">List Price</p>
                        <p className="text-xl font-black text-[#0205A6] inline-flex items-center gap-0.5"><SARSymbol />{parseFloat(selectedProduct.price).toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inventory Status</p>
                        <p className="text-xl font-black text-[#0A1E36]">{selectedProduct.stock} Units</p>
                      </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Product Description</h4>
                    <p className="text-sm text-[#0A1E36] font-medium leading-relaxed italic">
                       {selectedProduct.description || "No industrial specification data provided by the engine."}
                    </p>
                  </div>

                  {/* Specifications Registry */}
                  {selectedProduct.specifications && selectedProduct.specifications.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center justify-between">
                        <span>Technical Specifications</span>
                        <span className="text-[8px] bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full">{selectedProduct.specifications.length} ENTRIES</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.specifications.map((spec, i) => (
                           <div key={i} className="flex items-center justify-between py-1 bg-white/50 px-3 rounded-lg border border-gray-50">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{spec.specKey}</span>
                              <span className="text-[11px] font-bold text-[#0A1E36] italic">{spec.specValue}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Technical Registry</h4>
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-[11px]">
                           <span className="text-gray-400 font-bold uppercase">Source Entity:</span>
                           <span className="text-[#0A1E36] font-black">{selectedProduct.supplierName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                           <span className="text-gray-400 font-bold uppercase">System Ingest Date:</span>
                           <span className="text-[#0A1E36] font-black">{new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                           <span className="text-gray-400 font-bold uppercase">Health Threshold:</span>
                           <span className="text-[#DC2626] font-black italic">{selectedProduct.minimumStockThreshold} Units</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                   <button 
                    onClick={() => { setShowViewModal(false); openEditModal(selectedProduct); }}
                    className="flex-1 py-4 bg-gray-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-700 transition-all"
                   >
                     Update Records
                   </button>
                   {selectedProduct.status === 'PENDING' && (
                      <button 
                        onClick={() => { setShowViewModal(false); setShowApproveModal(true); }}
                        className="flex-1 py-4 bg-[#16A34A] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#15803d] transition-all"
                      >
                        Push to Market
                      </button>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A1E36]/90 backdrop-blur-sm animate-in zoom-in duration-200">
           <div className="bg-white rounded-[32px] p-10 max-w-md w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-[#16A34A]/10 text-[#16A34A] rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#0A1E36] tracking-tighter mb-2 italic uppercase">Approve Product?</h3>
              <p className="text-gray-500 font-medium mb-8">Make <span className="text-[#0205A6] font-bold">&quot;{selectedProduct.name}&quot;</span> live in the marketplace.</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowApproveModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest transition-all">Cancel</button>
                 <button onClick={handleApprove} className="flex-1 py-4 bg-[#16A34A] text-white rounded-2xl font-black uppercase tracking-widest transition-all">Approve</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0A1E36]/90 backdrop-blur-sm animate-in zoom-in duration-200">
           <div className="bg-white rounded-[32px] p-10 max-w-md w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-[#DC2626]/10 text-[#DC2626] rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#0A1E36] tracking-tighter mb-2 italic uppercase">Sanitize Records?</h3>
              <p className="text-gray-500 font-medium mb-8">This action is <span className="text-[#DC2626] font-bold">permanent</span> and cannot be undone.</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest transition-all">Cancel</button>
                 <button onClick={handleDelete} className="flex-1 py-4 bg-[#DC2626] text-white rounded-2xl font-black uppercase tracking-widest transition-all">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
