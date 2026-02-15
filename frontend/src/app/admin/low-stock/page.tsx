'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, Search, Filter } from 'lucide-react';
import adminService from '@/services/admin.service';
import Link from 'next/link';

export default function LowStockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        setLoading(true);
        const { data } = await adminService.getLowStockProducts();
        setProducts(data.data);
      } catch (err) {
        console.error('Failed to fetch low stock products');
        // Mock data for demo
        setProducts([
          { id: '1', name: 'Cat 320 Excavator', category: 'Excavators', stock: 1, threshold: 2, status: 'CRITICAL' },
          { id: '2', name: 'Komatsu D155 Dozer', category: 'Dozers', stock: 3, threshold: 5, status: 'WARNING' },
          { id: '3', name: 'JCB 3CX Backhoe', category: 'Loaders', stock: 0, threshold: 3, status: 'CRITICAL' },
          { id: '4', name: 'Bobcat S450', category: 'Skid Steers', stock: 4, threshold: 10, status: 'WARNING' },
        ] as any);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStock();
  }, []);

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Low Stock Alerts</h1>
          <p className="text-gray-500 mt-1">Manage and replenish inventory levels for critical items.</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shielder-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter size={18} className="mr-2" /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Threshold</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-3 border-shielder-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No low stock items found.</td>
              </tr>
            ) : (
              filteredProducts.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-semibold text-gray-800">{product.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">ID: {product.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`font-bold ${product.status === 'CRITICAL' ? 'text-shielder-critical' : 'text-shielder-warning'}`}>
                      {product.stock} Units
                    </div>
                  </td>
                  <td className="px-6 py-5 text-gray-600 font-medium">
                    {product.threshold} Units
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex ${
                      product.status === 'CRITICAL' 
                        ? 'bg-shielder-critical/10 text-shielder-critical border border-shielder-critical/20' 
                        : 'bg-shielder-warning/10 text-shielder-warning border border-shielder-warning/20'
                    }`}>
                      <AlertTriangle size={12} />
                      <span>{product.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link 
                      href={`/admin/products/${product.id}`}
                      className="inline-flex items-center text-shielder-primary hover:text-shielder-secondary font-bold text-sm transition-colors"
                    >
                      Update Stock <ChevronRight size={16} className="ml-0.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
