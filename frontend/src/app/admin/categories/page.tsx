'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Folder, ChevronRight, MoreVertical } from 'lucide-react';
import adminService from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data } = await adminService.getCategories();
        setCategories(data.data || []);
      } catch (err) {
        console.error('Failed to fetch categories');
        setCategories([
          { id: '1', name: 'Excavators', subCount: 5, prodCount: 42, color: 'bg-blue-500' },
          { id: '2', name: 'Bulldozers', subCount: 3, prodCount: 28, color: 'bg-orange-500' },
          { id: '3', name: 'Loaders', subCount: 4, prodCount: 35, color: 'bg-green-500' },
          { id: '4', name: 'Cranes', subCount: 6, prodCount: 15, color: 'bg-purple-500' },
        ] as any);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await adminService.deleteCategory(id);
        setCategories(categories.filter((c: any) => c.id !== id));
        toast.success('Category deleted successfully');
      } catch (err) {
        toast.error('Failed to delete category');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 mt-1 font-medium">Organize your marketplace hierarchy with categories and subcategories.</p>
        </div>
        <button className="flex items-center px-5 py-2.5 bg-shielder-primary text-white rounded-xl hover:bg-shielder-secondary transition-all shadow-lg shadow-shielder-primary/20 font-bold">
          <Plus size={20} className="mr-2" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse h-48"></div>
          ))
        ) : categories.map((cat: any) => (
          <div key={cat.id} className="bg-white group rounded-2xl border border-gray-100 overflow-hidden hover:border-shielder-primary/30 hover:shadow-xl transition-all duration-300">
            <div className={`h-2 ${cat.color || 'bg-shielder-primary'}`}></div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-shielder-primary/5 transition-colors">
                  <Folder className="text-shielder-primary" size={24} />
                </div>
                <div className="flex space-x-1">
                  <button className="p-2 text-gray-400 hover:text-shielder-primary hover:bg-gray-50 rounded-lg transition-all">
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-bold text-gray-800">{cat.name}</h3>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="text-sm font-medium">
                    <span className="text-shielder-primary">{cat.subCount}</span>
                    <span className="text-gray-400 ml-1">Subcategories</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <div className="text-sm font-medium">
                    <span className="text-shielder-primary">{cat.prodCount}</span>
                    <span className="text-gray-400 ml-1">Products</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                <button className="text-sm font-bold text-shielder-primary hover:text-shielder-secondary flex items-center transition-colors">
                  View Details <ChevronRight size={16} className="ml-1" />
                </button>
                <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  SH-{cat.id.slice(0, 4)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
