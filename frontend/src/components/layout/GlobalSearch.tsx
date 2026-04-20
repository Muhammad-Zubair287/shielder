'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, ShoppingCart, User, Tag, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '../../hooks/useDebounce';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/LanguageContext';

export const GlobalSearch = () => {
  const { isRTL } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const handleSearch = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      // In a real app, this would call a global search endpoint
      // Mocking results for now
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockResults = [
        { id: '1', title: `Product: ${searchTerm}`, type: 'product', sku: 'SKU-001', route: '/inventory/products' },
        { id: '2', title: `Order: #${searchTerm.toUpperCase()}`, type: 'order', route: '/orders' },
        { id: '3', title: `User: ${searchTerm}`, type: 'user', email: 'user@example.com', route: '/superadmin/users' },
        { id: '4', title: `Category: ${searchTerm}`, type: 'category', route: '/inventory/categories' },
      ].filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));

      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="text-blue-500" size={18} />;
      case 'order': return <ShoppingCart className="text-shielder-primary" size={18} />;
      case 'user': return <User className="text-purple-500" size={18} />;
      case 'category': return <Tag className="text-amber-500" size={18} />;
      default: return <Search size={18} />;
    }
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className={clsx(
        "relative flex items-center transition-all duration-300",
        isOpen ? "scale-100 lg:scale-105" : ""
      )}>
        <Search className={clsx(
          "absolute left-4 lg:left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
          isOpen ? "text-shielder-primary dark:text-[#ff8a5b]" : "text-gray-400 dark:text-slate-500"
        )} size={20} />
        
        <input 
          type="text" 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search..."
          className={clsx(
            "w-full pl-10 lg:pl-12 pr-10 lg:pr-12 py-2 lg:py-3 bg-gray-100/50 dark:bg-slate-900/70 border border-transparent dark:border-slate-800 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-shielder-primary/20 dark:focus:ring-[#ff8a5b]/20 focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500",
            isOpen ? "shadow-lg bg-white dark:bg-slate-950" : "hover:bg-gray-100 dark:hover:bg-slate-800/70",
            !isOpen ? "lg:w-full w-10 overflow-hidden cursor-pointer" : "w-full"
          )}
        />

        {isOpen && (
          <button 
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors lg:hidden"
          >
            <X size={16} className="text-gray-400 dark:text-slate-500" />
          </button>
        )}

        {query && (
          <button 
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-4 lg:right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors hidden lg:block"
          >
            <X size={16} className="text-gray-400 dark:text-slate-500" />
          </button>
        )}
      </div>

      {isOpen && (query || isLoading) && (
        <div className="absolute top-full left-0 right-0 lg:left-0 lg:right-0 mt-3 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 w-[calc(100vw-2rem)] lg:w-full -ml-[calc((100vw-100%-2rem)/2)] lg:ml-0" dir={isRTL ? 'rtl' : 'ltr'}>
          {isLoading ? (
            <div className="p-8 flex items-center justify-center space-x-3 text-gray-500 dark:text-slate-400">
              <Loader2 className="animate-spin text-shielder-primary dark:text-[#ff8a5b]" size={20} />
              <span className="font-medium">Searching across modules...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                Search Results
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    router.push(result.route);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-3 hover:bg-shielder-primary/5 dark:hover:bg-white/5 rounded-xl transition-all group/item ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="p-2 bg-gray-100 dark:bg-slate-900 rounded-lg group-hover/item:bg-white dark:group-hover/item:bg-slate-800 transition-colors">
                      {getIcon(result.type)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100 group-hover/item:text-shielder-primary dark:group-hover/item:text-[#ff8a5b] transition-colors">
                        {result.title}
                      </p>
                      <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-tight">
                        {result.type} {result.sku || result.email ? `• ${result.sku || result.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-gray-300 dark:text-slate-600 group-hover/item:text-shielder-primary dark:group-hover/item:text-[#ff8a5b] transition-all ${isRTL ? 'rotate-180 translate-x-0 group-hover/item:-translate-x-1' : 'translate-x-0 group-hover/item:translate-x-1'}`} />
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="text-gray-400 dark:text-slate-500" size={24} />
              </div>
              <p className="text-gray-800 dark:text-slate-100 font-bold italic">No results found for "{query}"</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Try searching by SKU, Order ID, or User Email</p>
            </div>
          ) : null}
          
          <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-center">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Tip: Press ESC to close search</p>
          </div>
        </div>
      )}
    </div>
  );
};
