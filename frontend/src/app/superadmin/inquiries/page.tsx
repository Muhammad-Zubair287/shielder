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
  Filter,
  Eye,
  X
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

export default function InquiriesPage() {
  const { t, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const queryClient = useQueryClient();

  const inquiriesQuery = useQuery({
    queryKey: ['superadmin-inquiries', searchTerm, statusFilter, page],
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
    queryKey: ['superadmin-inquiry-stats'],
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
    onSuccess: (data, variables) => {
      toast.success('Inquiry marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['superadmin-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-inquiry-stats'] });
      
      // OPTIMISTIC UPDATE: Update the local state of the inquiry if it's the selected one
      if (selectedInquiry && selectedInquiry.id === variables) {
        setSelectedInquiry(prev => prev ? { ...prev, status: 'RESOLVED' } : null);
      }
    },
    onError: (error: any) => {
      console.error('Resolution error:', error);
      toast.error(error?.response?.data?.message || 'Failed to resolve inquiry');
    }
  });

  const inquiries = inquiriesQuery.data?.data || [];
  const totalPages = inquiriesQuery.data?.pagination?.totalPages || 1;
  const stats = statsQuery.data?.data as InquiryStats | undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1637]">Customer Inquiries</h1>
          <p className="text-gray-500">Manage and respond to customer messages</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['superadmin-inquiries'] });
              queryClient.invalidateQueries({ queryKey: ['superadmin-inquiry-stats'] });
            }}
            className="p-2 text-gray-400 hover:text-[#F97316] transition-colors"
          >
            <RefreshCcw className={`w-5 h-5 ${inquiriesQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Inquiries</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.total || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.pending || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Resolved</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.resolved || 0}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name, email, or subject..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inquiries.length > 0 ? inquiries.map((inquiry: Inquiry) => (
                <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{inquiry.name}</p>
                        <p className="text-sm text-gray-500">{inquiry.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-medium truncate max-w-[200px]">{inquiry.subject || 'No Subject'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(inquiry.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      inquiry.status === 'PENDING' 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {inquiry.status === 'PENDING' && (
                      <button 
                        onClick={() => resolveMutation.mutate(inquiry.id)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Mark as Resolved"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {inquiriesQuery.isLoading ? 'Loading inquiries...' : 'No inquiries found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <UnifiedPagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0D1637]">Inquiry Details</h3>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Sender</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{selectedInquiry.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Email</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-orange-500" />
                    <a href={`mailto:${selectedInquiry.email}`} className="font-medium hover:text-[#F97316]">{selectedInquiry.email}</a>
                  </div>
                </div>
                {selectedInquiry.phone && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Phone</p>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Phone className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">{selectedInquiry.phone}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Date</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{format(new Date(selectedInquiry.createdAt), 'MMMM dd, yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Subject</p>
                <p className="text-lg font-bold text-gray-900">{selectedInquiry.subject || 'No Subject'}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Message</p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Attachment */}
              {selectedInquiry.fileUrl && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Attachment</p>
                  <a 
                    href={selectedInquiry.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    View Attachment
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              {selectedInquiry.status === 'PENDING' && (
                <button 
                  onClick={() => {
                    resolveMutation.mutate(selectedInquiry.id);
                  }}
                  disabled={resolveMutation.isPending}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Processing...' : 'Mark as Resolved'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
