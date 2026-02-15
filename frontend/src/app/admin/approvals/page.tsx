'use client';

import React, { useEffect, useState } from 'react';
import { Check, X, Box, User, ExternalLink, ShieldCheck } from 'lucide-react';
import adminService from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function ApprovalsPage() {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setLoading(true);
        const { data } = await adminService.getPendingProducts();
        setPendingProducts(data.data || []);
      } catch (err) {
        setPendingProducts([
          { id: 'p1', name: 'Tower Crane L-Type', supplier: 'Dubai Machinery Corp', price: '450,000', createdAt: '2026-02-12' },
          { id: 'p2', name: 'Mobile Generator 500kVA', supplier: 'Power Sources Ltd', price: '85,000', createdAt: '2026-02-11' },
          { id: 'p3', name: 'Heavy Duty Jack (Set of 4)', supplier: 'Tools & Parts SA', price: '12,000', createdAt: '2026-02-13' },
        ] as any);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await adminService.approveProduct(id);
        toast.success('Product published to marketplace');
      } else {
        await adminService.rejectProduct(id);
        toast.error('Product verification rejected');
      }
      setPendingProducts(pendingProducts.filter((p: any) => p.id !== id));
    } catch (err) {
      toast.error(`Failed to ${action} product`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Verify new product submissions before they go live.</p>
        </div>
        <div className="bg-shielder-warning/10 text-shielder-warning px-4 py-2 rounded-xl text-sm font-bold flex items-center border border-shielder-warning/20">
          <ShieldCheck size={18} className="mr-2" /> {pendingProducts.length} Pending Verifications
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="bg-white h-64 rounded-2xl animate-pulse"></div>)
        ) : pendingProducts.map((product: any) => (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-500">
            {/* Header */}
            <div className="p-6 pb-4 flex-1">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-shielder-primary group-hover:text-white transition-all duration-500">
                  <Box size={24} />
                </div>
                <button className="p-2 text-gray-400 hover:text-shielder-primary transition-colors">
                  <ExternalLink size={20} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mt-6 group-hover:text-shielder-primary transition-colors">{product.name}</h3>
              <div className="space-y-3 mt-4">
                <div className="flex items-center text-sm text-gray-500 font-medium">
                  <User size={16} className="mr-2 text-gray-400" /> 
                  <span className="text-gray-400 mr-2">Supplier:</span> 
                  <span className="text-gray-800">{product.supplier}</span>
                </div>
                <div className="text-2xl font-black text-shielder-primary">
                  {product.price} <span className="text-xs font-bold uppercase tracking-widest text-gray-400">SAR</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex space-x-3">
              <button 
                onClick={() => handleAction(product.id, 'reject')}
                className="flex-1 py-3 bg-white text-red-500 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center"
              >
                <X size={18} className="mr-2" /> Reject
              </button>
              <button 
                onClick={() => handleAction(product.id, 'approve')}
                className="flex-1 py-3 bg-shielder-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-shielder-primary/20 hover:bg-shielder-secondary transition-all flex items-center justify-center"
              >
                <Check size={18} className="mr-2" /> Approve
              </button>
            </div>
          </div>
        ))}
        {!loading && pendingProducts.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center">
            <div className="p-6 bg-green-50 text-green-500 rounded-full mb-4">
              <ShieldCheck size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Clear queue!</h3>
            <p className="text-gray-500 mt-1 font-medium">All products have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
