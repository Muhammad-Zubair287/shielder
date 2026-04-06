'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Mail,
  Phone,
  Calendar,
  RefreshCcw,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { validatePassword } from '@/utils/password';

// --- Types ---
interface Admin {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  profile?: {
    fullName?: string;
    phoneNumber?: string;
  };
}

interface SummaryData {
  totalAdmins: number;
  activeAdmins: number;
  suspendedAdmins: number;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ message: string }>;
    };
    status?: number;
  };
}

// --- Components ---

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    isActive 
      ? 'bg-[#E8F5E9] text-[#16A34A]' 
      : 'bg-[#FFEBEE] text-[#DC2626]'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
    {isActive ? 'Active' : 'Suspended'}
  </span>
);

const RoleBadge = ({ role }: { role: string }) => (
  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
    {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
  </span>
);

export default function AdminManagementPage() {
  const { user: currentUser } = useAuth();
  const { t, isRTL } = useLanguage();
  
  // State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalAdmins: 0,
    activeAdmins: 0,
    suspendedAdmins: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Selected Admin for actions
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [temporarySuspension, setTemporarySuspension] = useState(false);
  const [suspensionUntil, setSuspensionUntil] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteMode, setDeleteMode] = useState<'ARCHIVE' | 'PERMANENT'>('ARCHIVE');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'ADMIN',
    isActive: true
  });

  const handleAddInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setAddFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [adminsRes, summaryRes] = await Promise.all([
        adminService.getAdmins({
          page: pagination.page,
          limit: pagination.limit,
          search,
          role: roleFilter,
          status: statusFilter
        }),
        adminService.getAdminSummary()
      ]);
      
      setAdmins(adminsRes.data || []);
      setPagination(prev => ({
        ...prev,
        total: adminsRes.pagination?.total || 0,
        pages: adminsRes.pagination?.totalPages || adminsRes.pagination?.pages || 1
      }));
      setSummary(summaryRes.data || { totalAdmins: 0, activeAdmins: 0, suspendedAdmins: 0 });
    } catch (err) {
      const error = err as ApiErrorResponse;
      const message = error.response?.data?.message || 'Failed to fetch admins';
      if (!error.response) {
        toast.error('Network error. Failed to load data.');
      } else if (error.response?.status !== 401) { // Skip 401 as it's handled by interceptor
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, roleFilter, statusFilter]);
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      fieldErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      fieldErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      fieldErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      fieldErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        fieldErrors.password = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword) {
      fieldErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setAddFormErrors(fieldErrors);
      return;
    }

    setAddFormErrors({});

    try {
      setFormLoading(true);
      await adminService.createAdmin({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: formData.role
      });
      toast.success('Admin created successfully');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      // Handle known error scenarios
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 400 && message?.toLowerCase().includes('email already exists')) {
        toast.error('An admin with this email already exists');
      } else if (status === 401 || status === 403) {
        toast.error('You are not authorized to create admins');
      } else if (status === 400 && error.response?.data?.errors) {
        // Handle validation errors from backend
        const validationMsg = error.response.data.errors[0]?.message || 'Invalid input data';
        toast.error(validationMsg);
      } else if (!error.response) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(message || 'Failed to create admin');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    try {
      setFormLoading(true);
      await adminService.updateAdmin(selectedAdmin.id, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        isActive: formData.isActive
      });
      toast.success('Admin updated successfully');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('You are not authorized to update admins');
      } else if (!error.response) {
        toast.error('Network error. Failed to update admin.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update admin');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAdmin) return;

    if (selectedAdmin.isActive) {
      if (!suspensionReason.trim()) {
        return toast.error('Please provide a suspension reason');
      }

      if (temporarySuspension && !suspensionUntil) {
        return toast.error('Please select an expiry date for temporary suspension');
      }

      if (temporarySuspension && suspensionUntil && new Date(suspensionUntil) <= new Date()) {
        return toast.error('Suspension expiry must be in the future');
      }
    }

    try {
      setFormLoading(true);
      await adminService.updateAdminStatus(selectedAdmin.id, {
        isActive: !selectedAdmin.isActive,
        suspensionReason: selectedAdmin.isActive ? suspensionReason.trim() : undefined,
        suspensionUntil: selectedAdmin.isActive && temporarySuspension ? suspensionUntil : undefined,
      });
      toast.success(`Admin ${selectedAdmin.isActive ? 'suspended' : 'activated'} successfully`);
      setShowStatusModal(false);
      setSuspensionReason('');
      setTemporarySuspension(false);
      setSuspensionUntil('');
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('You are not authorized to change admin status');
      } else if (!error.response) {
        toast.error('Network error. Failed to update status.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update status');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setFormLoading(true);
      await adminService.deleteAdmin(selectedAdmin.id, {
        reason: deleteReason.trim(),
        mode: deleteMode,
      });
      toast.success(deleteMode === 'PERMANENT' ? 'Admin permanently deleted' : 'Admin archived successfully');
      setShowDeleteModal(false);
      setDeleteReason('');
      setDeleteMode('ARCHIVE');
      fetchData();
    } catch (err) {
      const error = err as ApiErrorResponse;
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('You are not authorized to delete admins');
      } else if (!error.response) {
        toast.error('Network error. Failed to delete admin.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete admin');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      role: 'ADMIN',
      isActive: true
    });
    setShowAddPassword(false);
    setShowAddConfirmPassword(false);
    setAddFormErrors({});
    setSelectedAdmin(null);
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      fullName: admin.profile?.fullName || '',
      email: admin.email,
      phoneNumber: admin.profile?.phoneNumber || '',
      role: admin.role,
      isActive: admin.isActive
    });
    setShowEditModal(true);
  };

  // --- Render ---

  if (loading) {
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
          <h1 className="text-2xl font-bold text-[#0A1E36]">{t('adminMgmtTitle')}</h1>
          <p className="text-gray-500 text-sm">{t('adminMgmtSubtitle')}</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-[10px] hover:bg-[#FF5722] transition-colors font-semibold shadow-sm"
        >
          <UserPlus size={18} />
          {t('addAdmin')}
        </button>
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('totalAdmins'), value: summary.totalAdmins, icon: Users, color: '#0205A6' },
          { label: t('activeAdmins'), value: summary.activeAdmins, icon: ShieldCheck, color: '#16A34A' },
          { label: t('suspendedAdmins'), value: summary.suspendedAdmins, icon: ShieldAlert, color: '#DC2626' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-t-4" style={{ borderTopColor: card.color }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{card.label}</p>
                <h3 className="text-2xl font-bold text-[#0A1E36] mt-1">{card.value}</h3>
              </div>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${card.color}10` }}>
                <card.icon size={24} style={{ color: card.color }} />
              </div>
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
            placeholder={t('searchUsers')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="flex-1 md:w-40 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0205A6] bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t('all')} {t('admins')}</option>
            <option value="ADMIN">{t('roleAdmin')}</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select 
            className="flex-1 md:w-40 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0205A6] bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="ACTIVE">{t('active')}</option>
            <option value="SUSPENDED">{t('suspendedAdmins')}</option>
          </select>
          <button 
            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4. Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A1E36] bg-opacity-[0.02]">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('name')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('usersColPhone')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('usersColRole')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('usersColJoined')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {admins.length > 0 ? admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0A1E36]">{admin.profile?.fullName || 'Untitled Admin'}</span>
                      <span className="text-[10px] text-gray-400 font-mono tracking-tighter">REF: {admin.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail size={12} className="text-gray-400" />
                        {admin.email}
                      </div>
                      {admin.profile?.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Phone size={12} className="text-gray-400" />
                          {admin.profile.phoneNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={admin.role} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge isActive={admin.isActive} />
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#045870]" />
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <button 
                        onClick={() => openEditModal(admin)}
                        className="w-24 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#FF6B35] bg-[#FF6B35]/5 hover:bg-[#FF6B35]/10 rounded-lg transition-all border border-transparent hover:border-[#FF6B35]/20 disabled:opacity-20"
                        disabled={admin.id === currentUser?.id}
                      >
                        <Edit2 size={10} />
                        <span>{t('edit')}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setSuspensionReason('');
                          setTemporarySuspension(false);
                          setSuspensionUntil('');
                          setShowStatusModal(true);
                        }}
                        className={`w-24 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-transparent disabled:opacity-20 ${
                          admin.isActive 
                            ? 'text-[#DC2626] bg-[#DC2626]/5 hover:bg-[#DC2626]/10 hover:border-[#DC2626]/20' 
                            : 'text-[#16A34A] bg-[#16A34A]/5 hover:bg-[#16A34A]/10 hover:border-[#16A34A]/20'
                        }`}
                        disabled={admin.id === currentUser?.id}
                      >
                        {admin.isActive ? <EyeOff size={10} /> : <Eye size={10} />}
                        <span>{admin.isActive ? t('suspendAdmin') : t('activateAdmin')}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setDeleteReason('');
                          setDeleteMode('ARCHIVE');
                          setShowDeleteModal(true);
                        }}
                        className="w-24 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#DC2626] bg-[#DC2626]/5 hover:bg-[#DC2626]/10 rounded-lg transition-all border border-transparent hover:border-[#DC2626]/20 disabled:opacity-20"
                        disabled={admin.id === currentUser?.id || admin.role === 'SUPER_ADMIN'}
                        title={admin.role === 'SUPER_ADMIN' ? 'Super Admin accounts are protected' : admin.id === currentUser?.id ? 'Cannot delete your own account' : ''}
                      >
                        <Trash2 size={10} />
                        <span>{t('delete')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Users size={48} className="text-gray-200" />
                      </div>
                      <p className="font-semibold text-gray-600">{t('noAccountsFound')}</p>
                      <p className="text-xs max-w-xs mx-auto">{t('noResultsFound')}</p>
                      <button 
                        onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
                        className="mt-2 text-sm text-[#0205A6] font-bold hover:underline"
                      >
                        {t('reset')}
                      </button>
                    </div>
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
          pageSize={pagination.limit}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          isRTL={isRTL}
        />
      </div>

      {/* --- Modals --- */}

      {/* 5. ADD ADMIN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35] text-white rounded-lg">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0A1E36]">{t('addAdmin')}</h2>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">System Access Protocol</p>
                </div>
              </div>
              <button onClick={() => { resetForm(); setShowAddModal(false); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('name')}</label>
                  <input
                    type="text"
                    required
                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm ${addFormErrors.fullName ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder={t('enterName')}
                    value={formData.fullName}
                    onChange={(e) => handleAddInputChange('fullName', e.target.value)}
                  />
                  {addFormErrors.fullName && (
                    <p className="mt-1 text-xs text-red-500">{addFormErrors.fullName}</p>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('phone')}</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm"
                    placeholder="+966 50 000 0000"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Corporate Email</label>
                <div className="flex items-stretch">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="admin"
                      className={`w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-r-0 rounded-l-xl focus:ring-2 focus:ring-inset focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm ${addFormErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                      value={formData.email.replace('@shielder.com', '')}
                      onChange={(e) => {
                        const prefix = e.target.value.replace(/@.*/, '').replace(/\s/g, '');
                        handleAddInputChange('email', prefix ? `${prefix}@shielder.com` : '');
                      }}
                    />
                  </div>
                  <span className="flex items-center px-3 py-2.5 bg-[#0C1B33] text-white text-xs font-black rounded-r-xl border border-[#0C1B33] whitespace-nowrap select-none">
                    @shielder.com
                  </span>
                </div>
                {addFormErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{addFormErrors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Access Password</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      className={`w-full px-4 pr-11 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm ${addFormErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleAddInputChange('password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0205A6]"
                      aria-label={showAddPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {addFormErrors.password && (
                    <p className="mt-1 text-xs text-red-500">{addFormErrors.password}</p>
                  )}
                  {formData.password && (
                    <PasswordStrengthMeter password={formData.password} showRequirements={true} className="mt-2" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showAddConfirmPassword ? 'text' : 'password'}
                      required
                      className={`w-full px-4 pr-11 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm ${addFormErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleAddInputChange('confirmPassword', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0205A6]"
                      aria-label={showAddConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showAddConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {addFormErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{addFormErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowAddModal(false); }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-[#FF6B35] text-white rounded-xl hover:bg-[#FF5722] transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {t('addAdmin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT ADMIN MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35] text-white rounded-lg">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0A1E36]">{t('editAdmin')}</h2>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Update administrator details</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateAdmin} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">System Email (ReadOnly)</label>
                  <input
                    type="email"
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-100 text-gray-400 rounded-xl cursor-not-allowed text-sm font-mono"
                    value={formData.email}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm"
                  placeholder="+966..."
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Access Status</label>
                <select 
                  className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:outline-none transition-all text-sm font-bold ${formData.isActive ? 'text-[#16A34A] focus:ring-[#16A34A]' : 'text-[#DC2626] focus:ring-[#DC2626]'}`}
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                  disabled={selectedAdmin?.id === currentUser?.id}
                >
                  <option value="true">AUTHORIZED</option>
                  <option value="false">SUSPENDED</option>
                </select>
              </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-[#FF6B35] text-white rounded-xl hover:bg-[#FF5722] transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. STATUS TOGGLE MODAL */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border-t-8 border-[#0205A6]">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 rotate-12 transition-transform hover:rotate-0 duration-300 ${selectedAdmin?.isActive ? 'bg-[#DC2626] bg-opacity-10 text-[#DC2626]' : 'bg-[#16A34A] bg-opacity-10 text-[#16A34A]'}`}>
              {selectedAdmin?.isActive ? <EyeOff size={32} /> : <Eye size={32} />}
            </div>
            <h2 className="text-2xl font-black text-[#0A1E36] mb-2 uppercase tracking-tight text-center">
              {selectedAdmin?.isActive ? t('confirmSuspendTitle') : t('confirmActivateAdminTitle')}
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed text-center">
              Admin: <span className="font-bold text-gray-800">{selectedAdmin?.profile?.fullName || selectedAdmin?.email}</span>.
              {selectedAdmin?.isActive 
                ? ' This will immediately disable their access to the admin portal.' 
                : ' This will restore their access to the admin portal.'}
            </p>
            {selectedAdmin?.isActive && (
              <div className="space-y-4 text-left mb-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Reason for suspension</label>
                  <textarea
                    rows={3}
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm resize-none"
                    placeholder="e.g. misconduct, inactivity, policy violation"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={temporarySuspension}
                    onChange={(e) => setTemporarySuspension(e.target.checked)}
                    className="h-4 w-4 accent-[#0205A6]"
                  />
                  Temporary suspension with expiry date
                </label>
                {temporarySuspension && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Suspension expiry</label>
                    <input
                      type="date"
                      value={suspensionUntil}
                      onChange={(e) => setSuspensionUntil(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm"
                    />
                  </div>
                )}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
                  <p className="font-black uppercase tracking-widest text-[10px] mb-1">Warning</p>
                  <p>This action will block access immediately and will be recorded in the audit trail for Super Admin review.</p>
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-bold text-xs uppercase tracking-widest transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={formLoading}
                className={`flex-1 px-4 py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${selectedAdmin?.isActive ? 'bg-[#DC2626] hover:bg-red-700' : 'bg-[#16A34A] hover:bg-green-700'}`}
              >
                {formLoading && <Loader2 className="animate-spin" size={16} />}
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1E36]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border-b-8 border-[#DC2626]">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#DC2626] bg-opacity-10 text-[#DC2626] flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-[#0A1E36] mb-3 uppercase tracking-tight text-center">{t('confirmDeleteAdminTitle')}</h2>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-4">
              <p className="text-[#DC2626] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertTriangle size={14} /> Attention
              </p>
              <p className="text-gray-600 text-xs mt-1 leading-relaxed px-2">
                You are about to remove <b>{selectedAdmin?.profile?.fullName || selectedAdmin?.email}</b>. This action is logged in the audit trail.
              </p>
            </div>
            <div className="space-y-4 mb-6 text-left">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Deletion mode</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`border rounded-xl p-3 cursor-pointer transition-all ${deleteMode === 'ARCHIVE' ? 'border-[#0205A6] bg-[#0205A6]/5' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="ARCHIVE"
                        checked={deleteMode === 'ARCHIVE'}
                        onChange={() => setDeleteMode('ARCHIVE')}
                        className="mt-1 accent-[#0205A6]"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-800">Archive (Soft Delete)</p>
                        <p className="text-xs text-gray-500">Keeps record for audit/history.</p>
                      </div>
                    </div>
                  </label>
                  <label className={`border rounded-xl p-3 cursor-pointer transition-all ${deleteMode === 'PERMANENT' ? 'border-[#DC2626] bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="PERMANENT"
                        checked={deleteMode === 'PERMANENT'}
                        onChange={() => setDeleteMode('PERMANENT')}
                        className="mt-1 accent-[#DC2626]"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-800">Permanent Delete</p>
                        <p className="text-xs text-gray-500">Removes account permanently.</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Reason for deletion</label>
                <textarea
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0205A6] focus:bg-white focus:outline-none transition-all text-sm resize-none"
                  placeholder="e.g. duplicate account, policy violation, employee exit"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-bold text-xs uppercase tracking-widest transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteAdmin}
                disabled={formLoading}
                className={`flex-1 px-4 py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${deleteMode === 'PERMANENT' ? 'bg-[#DC2626] hover:bg-red-700' : 'bg-[#0205A6] hover:bg-[#01048f]'}`}
              >
                {formLoading && <Loader2 className="animate-spin" size={16} />}
                {deleteMode === 'PERMANENT' ? `${t('delete')} ${t('admins')}` : 'Archive Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

