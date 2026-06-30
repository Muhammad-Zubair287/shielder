'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  UserCheck,
  UserX,
  RefreshCcw,
  Calendar,
  Shield,
  UserPlus,
  Lock,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { getImageUrl } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type UserFormErrors = {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  password?: string[];
  role?: string;
  status?: string;
};

const NAME_REGEX = /^[a-zA-Z\s]+$/;
const PHONE_REGEX = /^[0-9]+$/;
const NAME_ERROR = 'Name must contain letters only and cannot exceed 25 characters';
const PHONE_ERROR = 'Phone number must contain digits only and cannot exceed 15 characters';

const mapValidationErrors = (apiErrors: Array<{ field?: string; message?: string }>): UserFormErrors => {
  const nextErrors: UserFormErrors = {};

  for (const error of apiErrors) {
    if (!error.field || !error.message) continue;

    if (error.field === 'password') {
      nextErrors.password = [...(nextErrors.password ?? []), error.message];
      continue;
    }

    if (error.field === 'email' || error.field === 'fullName' || error.field === 'phoneNumber' || error.field === 'role' || error.field === 'status') {
      nextErrors[error.field] = error.message;
    }
  }

  return nextErrors;
};

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newlyRegistered: number;
}

export default function UserManagement() {
  const { t, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'USER',
    status: 'ACTIVE'
  });

  const usersQuery = useQuery({
    queryKey: ['superadmin-users-list', searchTerm, roleFilter, statusFilter, page],
    queryFn: () =>
      adminService.getAllUsers({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: 10,
      }),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const statsQuery = useQuery({
    queryKey: ['superadmin-users-stats'],
    queryFn: () => adminService.getUserManagementStats(),
    staleTime: 60 * 1000,
  });

  const users = usersQuery.data?.data || [];
  const totalPages = usersQuery.data?.pagination?.totalPages || usersQuery.data?.pagination?.pages || 1;
  const totalItems = usersQuery.data?.pagination?.total || 0;
  const stats = (statsQuery.data?.data as UserStats | undefined) ?? null;
  const loading = usersQuery.isLoading || statsQuery.isLoading;

  const upsertUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: any }) => {
      if (id) {
        return adminService.updateUserAccount(id, payload);
      }
      return adminService.createUserAccount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-users-stats'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteUserAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-users-stats'] });
    },
  });

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        fullName: user.profile?.fullName || '',
        phoneNumber: user.profile?.phoneNumber || '',
        role: user.role,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE'
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        role: 'ADMIN',
        status: 'ACTIVE'
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: UserFormErrors = {};
    const trimmedName = formData.fullName.trim();
    const trimmedPhone = formData.phoneNumber.trim();

    if (!trimmedName || trimmedName.length > 25 || !NAME_REGEX.test(trimmedName)) {
      nextErrors.fullName = NAME_ERROR;
    }

    if (trimmedPhone && (trimmedPhone.length > 15 || !PHONE_REGEX.test(trimmedPhone))) {
      nextErrors.phoneNumber = PHONE_ERROR;
    }

    if (!editingUser && !formData.password.trim()) {
      nextErrors.password = ['Password is required'];
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      if (editingUser?.id) {
        await upsertUserMutation.mutateAsync({ id: editingUser.id, payload: formData });
        toast.success(t('userUpdated'));
      } else {
        await upsertUserMutation.mutateAsync({ payload: formData });
        toast.success(t('userCreated'));
      }
      setFormErrors({});
      setIsModalOpen(false);
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const mappedErrors = mapValidationErrors(apiErrors);
        if (Object.keys(mappedErrors).length > 0) {
          setFormErrors(mappedErrors);
          return;
        }
      }

      const message = err?.response?.data?.message || t('userCreateFailed');
      if (typeof message === 'string' && message.toLowerCase().includes('email')) {
        setFormErrors((prev) => ({ ...prev, email: message }));
        return;
      }

      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDeleteMsg'))) return;
    try {
      await deleteUserMutation.mutateAsync(id);
      toast.success(t('userDeleted'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('userDeleteFailed'));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ADMIN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'STAFF': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'USER': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'SUPPLIER': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="space-y-6 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('usersTitle')}</h1>
          </div>
          <p className="text-gray-500 text-sm">{t('userMgmtSubtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold text-sm hover:bg-[#FF5722] transition-all shadow-lg shadow-[#FF6B35]/20 group"
        >
          <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
          <span>{t('addNewUser')}</span>
        </button>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('totalUsers'), value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('activeUsers'), value: stats?.activeUsers || 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('inactiveUsers'), value: stats?.inactiveUsers || 0, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
          { label: t('joinedThisMonth'), value: stats?.newlyRegistered || 0, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-shielder-dark leading-none">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('searchUsers')}
              dir="ltr"
              className="input-ltr w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shielder-primary text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select 
            className="flex-1 md:flex-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 focus:outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t('allRoles')}</option>
            <option value="ADMIN">{t('roleAdmin')}</option>
            <option value="USER">{t('roleCustomer')}</option>
          </select>
          <select 
            className="flex-1 md:flex-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="ACTIVE">{t('active')}</option>
            <option value="INACTIVE">{t('inactive')}</option>
          </select>
          <button 
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('');
              setStatusFilter('');
              setPage(1);
              queryClient.invalidateQueries({ queryKey: ['superadmin-users-list'] });
            }}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-shielder-dark hover:border-shielder-dark transition-all"
            title="Clear Filters"
          >
            <RefreshCcw size={20} className={usersQuery.isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('usersColUser')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('userRole')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('accountStatus')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('usersColPhone')}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('usersColJoined')}</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-10 bg-gray-100 rounded w-48"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} className="text-gray-200" />
                      </div>
                      <p className="text-gray-900 font-black uppercase tracking-tight">{t('noAccountsFound')}</p>
                      <p className="text-gray-400 text-sm mt-1">{t('adjustFiltersOrAdd')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-shielder-dark text-white flex items-center justify-center font-black text-lg shadow-inner overflow-hidden">
                          {user.profile?.profileImage ? (
                            <img
                              src={getImageUrl(user.profile.profileImage) || ''}
                              alt={user.profile?.fullName || user.email}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.profile?.fullName?.[0] || user.email[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-tight">
                            {user.profile?.fullName || 'Untitled Identity'}
                            {user.role === 'SUPER_ADMIN' && <Shield size={12} className="inline ml-1 text-shielder-primary" />}
                          </p>
                          <div className="flex items-center text-xs text-gray-400 mt-0.5">
                            <Mail size={10} className="mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                          {user.role === 'USER' ? t('roleCustomer') : 
                         user.role === 'SUPER_ADMIN' ? t('roleSuperAdmin') : 
                         user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {user.isActive ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{t('active')}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('lockedStatus')}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                        {user.profile?.phoneNumber || t('noPhoneRegistered') || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight flex items-center">
                        <Calendar size={12} className="mr-1.5 text-gray-300" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-gray-400 hover:text-shielder-primary hover:bg-shielder-primary/5 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          disabled={user.role === 'SUPER_ADMIN'}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.role === 'SUPER_ADMIN' ? 'Super Admin accounts are protected' : 'Soft Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Toolbar */}
        <UnifiedPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={10}
          onPageChange={setPage}
          isRTL={isRTL}
          labels={{
            total: t('total'),
            results: t('results'),
            previous: t('previous'),
            next: t('next'),
          }}
        />
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-shielder-dark p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3 text-white">
                <div className="p-2 bg-white/10 rounded-xl">
                  {editingUser ? <Edit size={24} /> : <UserPlus size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">{editingUser ? t('editUserTitle') : t('addNewUserTitle')}</h3>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{editingUser ? t('updateAccountDetails') : t('createNewAccount')}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white group">
                <XCircle size={28} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('name')}</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({...formData, fullName: e.target.value});
                      setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] text-red-500 font-medium">{formErrors.fullName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('phone')}</label>
                  <input 
                    type="text" 
                    placeholder="Phone number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      setFormData({...formData, phoneNumber: e.target.value});
                      setFormErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                    }}
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-[11px] text-red-500 font-medium">{formErrors.phoneNumber}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
                {formData.role === 'ADMIN' && !editingUser ? (
                  // ADMIN: prefix input + fixed @shielder.com suffix
                  <div className="flex items-stretch">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input
                        type="text"
                        required
                        placeholder="username"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#FF6B35]"
                        value={formData.email.replace('@shielder.com', '')}
                        onChange={(e) => {
                          const prefix = e.target.value.replace(/@.*/, '').replace(/\s/g, '');
                          setFormData({...formData, email: prefix ? `${prefix}@shielder.com` : ''});
                          setFormErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                      />
                    </div>
                    <span className="flex items-center px-3 py-2.5 bg-[#0C1B33] text-white text-xs font-black rounded-r-xl border border-[#0C1B33] whitespace-nowrap select-none">
                      @shielder.com
                    </span>
                  </div>
                ) : (
                  // Non-ADMIN or edit mode: normal email input
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                      type="email"
                      required
                      disabled={!!editingUser}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary disabled:opacity-50"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({...formData, email: e.target.value});
                        setFormErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                    />
                  </div>
                )}
                {formErrors.email && (
                  <p className="text-[11px] text-red-500 font-medium">{formErrors.email}</p>
                )}
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      type="password" 
                      required
                      placeholder="Enter password"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({...formData, password: e.target.value});
                        setFormErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                    />
                  </div>
                  {Array.isArray(formErrors.password) && formErrors.password.length > 0 && (
                    <div className="space-y-1">
                      {formErrors.password.map((message, index) => (
                        <p key={`password-error-${index}`} className="text-[11px] text-red-500 font-medium">
                          {message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('userRole')}</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary"
                    value={formData.role}
                    onChange={(e) => {
                      setFormData({...formData, role: e.target.value, email: ''});
                      setFormErrors((prev) => ({ ...prev, role: undefined, email: undefined }));
                    }}
                  >
                    <option value="ADMIN">{t('roleAdmin')}</option>
                    <option value="USER">{t('simpleUser')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('accountStatus')}</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-shielder-primary"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">{t('active')}</option>
                    <option value="INACTIVE">{t('inactive')}</option>
                  </select>
                </div>
              </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex space-x-3 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-[#FF6B35] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#FF5722] transition-all shadow-lg shadow-[#FF6B35]/20"
                >
                  {editingUser ? t('saveChanges') : t('createAccountBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
