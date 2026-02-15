'use client';

import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, Shield, User, Mail, MoreHorizontal } from 'lucide-react';
import adminService from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await adminService.getUsers();
        setUsers(data.data || []);
      } catch (err) {
        setUsers([
          { id: '1', name: 'Zubair Mohammed', email: 'm.zubair@devflx.com', role: 'SUPER_ADMIN', status: 'ACTIVE' },
          { id: '2', name: 'Ahmad Al-Saud', email: 'ahmad@alrashed.com', role: 'SUPPLIER', status: 'PENDING' },
          { id: '3', name: 'Sara Khan', email: 'sara.k@gmail.com', role: 'USER', status: 'ACTIVE' },
          { id: '4', name: 'Faisal Motors', email: 'sales@faisalmotors.sa', role: 'SUPPLIER', status: 'ACTIVE' },
        ] as any);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await adminService.updateUserRole(id, 'SUPPLIER');
      toast.success('Supplier approved successfully');
      setUsers(users.map((u: any) => u.id === id ? { ...u, status: 'ACTIVE' } : u));
    } catch (err) {
      toast.error('Failed to approve supplier');
    }
  };

  const filteredUsers = users.filter((u: any) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SUPPLIERS') return u.role === 'SUPPLIER';
    if (activeTab === 'PENDING') return u.status === 'PENDING';
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1 font-medium">Manage permissions, roles, and supplier approvals.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4 md:space-y-0">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['ALL', 'SUPPLIERS', 'PENDING'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-white text-shielder-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-shielder-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User Profile</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Current Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Account Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center text-gray-400">Loading Shielder Users...</td></tr>
            ) : filteredUsers.map((user: any) => (
              <tr key={user.id} className="hover:bg-shielder-primary/5 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-shielder-secondary/10 text-shielder-secondary flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{user.name}</div>
                      <div className="text-xs text-gray-400 flex items-center mt-1">
                        <Mail size={12} className="mr-1" /> {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold space-x-1.5 ${
                    user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'SUPPLIER' ? 'bg-shielder-primary/10 text-shielder-primary' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'SUPER_ADMIN' ? <Shield size={12} /> : <User size={12} />}
                    <span>{user.role}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className={`flex items-center space-x-2 text-xs font-bold ${
                    user.status === 'ACTIVE' ? 'text-green-600' : 'text-orange-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-600' : 'bg-orange-500'}`}></div>
                    <span>{user.status}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end space-x-2">
                    {user.status === 'PENDING' && (
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="px-3 py-1 bg-shielder-primary text-white rounded-lg text-xs font-bold flex items-center hover:bg-shielder-secondary transition-all"
                      >
                        <UserCheck size={14} className="mr-1" /> Approve
                      </button>
                    )}
                    <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <UserX size={16} />
                    </button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
