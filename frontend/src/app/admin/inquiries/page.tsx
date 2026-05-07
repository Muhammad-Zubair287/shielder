'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  RefreshCcw,
  CheckCircle,
  Clock,
  User,
  Mail,
  Phone,
  Paperclip,
  ExternalLink,
  Eye,
  X,
  AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api.service';
import { API_ENDPOINTS } from '@/utils/constants';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { format } from 'date-fns';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  fileUrl: string | null;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}

interface InquiryStats {
  pending: number;
  resolved: number;
  total: number;
}

export default function AdminInquiriesPage() {
  const { t, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const queryClient = useQueryClient();

  const inquiriesQuery = useQuery({
    queryKey: ['admin-inquiries', searchTerm, statusFilter, page],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SUPER_ADMIN.INQUIRIES, {
        params: {
          search: searchTerm,
          status: statusFilter,
          page,
          limit: 10,
        }
      });
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ['admin-inquiry-stats'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.SUPER_ADMIN.INQUIRY_STATS);
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.put(API_ENDPOINTS.SUPER_ADMIN.INQUIRY_RESOLVE(id));
      return response.data;
    },
    onSuccess: () => {
      toast.success('Inquiry marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inquiry-stats'] });
      if (selectedInquiry) {
        setSelectedInquiry(prev => prev ? { ...prev, status: 'RESOLVED' } : null);
      }
    },
    onError: () => {
      toast.error('Failed to resolve inquiry');
    }
  });

  const inquiries = inquiriesQuery.data?.data || [];
  const totalPages = inquiriesQuery.data?.pagination?.totalPages || 1;
  const stats = statsQuery.data?.data as InquiryStats | undefined;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#f8fafc] min-h-screen">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">Customer Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage customer support messages</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] });
              queryClient.invalidateQueries({ queryKey: ['admin-inquiry-stats'] });
            }}
            className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-400 hover:text-[#FF6B35] transition-all"
            title="Refresh Data"
          >
            <RefreshCcw className={`w-5 h-5 ${inquiriesQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards - Admin Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Total Inquiries</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5 truncate">{stats?.total || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Pending</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5 truncate">{stats?.pending || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Resolved</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5 truncate">{stats?.resolved || 0}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter - Admin Style */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 rounded-xl border-none focus:ring-2 focus:ring-[#FF6B35]/20 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2.5 bg-gray-50/50 rounded-xl border-none focus:ring-2 focus:ring-[#FF6B35]/20 text-sm font-medium text-gray-600 min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Modern Table - Admin Style */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sender</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Subject</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inquiries.length > 0 ? inquiries.map((inquiry: Inquiry) => (
                <tr key={inquiry.id} className="group hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                        {inquiry.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none">{inquiry.name}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{inquiry.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{inquiry.subject || '—'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs text-gray-500 font-medium">{format(new Date(inquiry.createdAt), 'MMM dd, yyyy')}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inquiry.status === 'PENDING' 
                        ? 'bg-orange-50 text-orange-600' 
                        : 'bg-green-50 text-green-600'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${inquiry.status === 'PENDING' ? 'bg-orange-600' : 'bg-green-600'}`} />
                      {inquiry.status}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {inquiry.status === 'PENDING' && (
                        <button 
                          onClick={() => resolveMutation.mutate(inquiry.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Mark as Resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    {inquiriesQuery.isLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCcw className="w-8 h-8 text-[#FF6B35] animate-spin" />
                        <p className="text-sm font-medium text-gray-400">Loading inquiries...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300">
                          <MessageSquare className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">No inquiries found</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-400">
              Showing page {page} of {totalPages}
            </p>
            <UnifiedPagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Details Slide-over/Modal - Admin Style */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div>
                <h3 className="text-xl font-black text-gray-900">Inquiry Conversation</h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">ID: {selectedInquiry.id.split('-')[0].toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all hover:rotate-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {/* Profile Card */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-[#FF6B35]" />
                      <span className="text-sm font-bold text-gray-900">{selectedInquiry.name}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-[#FF6B35]" />
                      <a href={`mailto:${selectedInquiry.email}`} className="text-sm font-bold text-gray-900 hover:text-[#FF6B35] underline decoration-[#FF6B35]/20">{selectedInquiry.email}</a>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received On</p>
                    <div className="flex items-center gap-2 mt-1 text-gray-900">
                      <Clock className="w-4 h-4 text-[#FF6B35]" />
                      <span className="text-sm font-bold">{format(new Date(selectedInquiry.createdAt), 'MMMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  {selectedInquiry.phone && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                      <div className="flex items-center gap-2 mt-1 text-gray-900">
                        <Phone className="w-4 h-4 text-[#FF6B35]" />
                        <span className="text-sm font-bold">{selectedInquiry.phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-[#FF6B35] rounded-full" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject: {selectedInquiry.subject || 'No Subject'}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 text-sm font-medium text-gray-700 leading-relaxed shadow-sm">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Attachment */}
              {selectedInquiry.fileUrl && (
                <div className="pt-2">
                  <a 
                    href={selectedInquiry.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                        <Paperclip className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-900">Attached Document</p>
                        <p className="text-[10px] text-indigo-500 font-medium">Click to view full attachment</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                  </a>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                <AlertTriangle className="w-3 h-3" />
                Internal Staff Review Only
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setSelectedInquiry(null)}
                  className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-white transition-all border border-transparent hover:border-gray-200"
                >
                  Dismiss
                </button>
                {selectedInquiry.status === 'PENDING' && (
                  <button 
                    onClick={() => {
                      resolveMutation.mutate(selectedInquiry.id);
                    }}
                    disabled={resolveMutation.isPending}
                    className="flex-1 md:flex-none px-8 py-3 bg-[#0D1637] text-white rounded-2xl text-sm font-black hover:bg-[#FF6B35] transition-all shadow-lg shadow-[#0D1637]/20 disabled:opacity-50"
                  >
                    {resolveMutation.isPending ? 'Processing...' : 'Mark as Resolved'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
