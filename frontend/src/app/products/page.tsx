'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, ShoppingCart, Search, X, Check, Plus, Minus, Download, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useQuotation } from '@/contexts/QuotationContext';
import { getImageUrl } from '@/utils/helpers';
import { resolveProductDescription, resolveProductImage, resolveProductName } from '@/utils/productDisplay';
import SARSymbol from '@/components/SARSymbol';
import { useAuthStore } from '@/store/auth.store';
import { useProductsCatalog } from '@/hooks/useProductsCatalog';
import {
  productComparisonService,
  type ComparedProductItem,
} from '@/services/product-comparison.service';
import {
  PRODUCTS_ITEMS_PER_PAGE,
  PRODUCTS_SORT_OPTIONS,
  PRODUCT_UI_LABELS,
} from './products.constants';
import { ActiveFilters, Category, Product, ProductTab } from './products.types';
import UnifiedPagination from '@/components/ui/UnifiedPagination';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = ProductTab;

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, tab, t, isRTL, isAuthenticated, onProductClick, isCompared, onToggleCompare }: {
  product: Product; tab: Tab; t: (k: string) => string; isRTL: boolean;
  isAuthenticated: boolean; onProductClick: () => void;
  isCompared: boolean;
  onToggleCompare: (product: Product) => void;
}) {
  const rawImage = resolveProductImage(product);
  const image     = getImageUrl(rawImage) ?? null;
  const [imgError, setImgError] = useState(false);
  const price     = Number(product.price);
  const original = Number(product.originalPrice ?? price * 1.2);
  const isQuotation = tab === 'quotation';
  const { addItem, loading: cartLoading } = useCart();
  const router = useRouter();
  const productName = resolveProductName(product, isRTL ? 'ar' : 'en');
  const productDescription = resolveProductDescription(product, isRTL ? 'ar' : 'en');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/products');
      router.push('/login');
      return;
    }
    addItem(
      product.id,
      1,
      {
        id: product.id,
        name: productName,
        thumbnail: rawImage,
        stock: product.stock,
      },
      price,
    );
  };

  // Shorten category name to uppercase abbreviation for the badge (e.g. 'Air Filters' → 'AIR')
  const badgeLabel = product.categoryName
    ? product.categoryName.replace(/filters?/i, '').trim().toUpperCase() || product.categoryName.toUpperCase()
    : null;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer"
      onClick={onProductClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onProductClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open product details for ${product.name}`}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-white">
        {image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover object-center"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100">
            <ImageOff size={36} className="text-gray-300" />
            <span className="text-xs text-gray-400 font-medium">{t('productsNoImage') || 'No Image'}</span>
          </div>
        )}
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {t('productsOutOfStock')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className={`p-4 flex flex-col gap-1.5 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Category badge */}
        {badgeLabel && (
          <span className="inline-flex self-start border border-gray-300 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wider">
            {badgeLabel}
          </span>
        )}

        {/* Name */}
        <h3 className="font-bold text-gray-900 text-sm leading-snug mt-0.5">{productName}</h3>

        {/* Filter Number / SKU */}
        {(product.filterNumber || product.sku) && (
          <p className="text-gray-400 text-xs">
            {product.filterNumber ? `#${product.filterNumber}` : product.sku}
          </p>
        )}

        {/* Description */}
        <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{productDescription}</p>

        {/* Price */}
        {isQuotation ? (
          <p className="text-[#0205A6] font-bold text-base mt-1 flex items-center gap-1">
            <SARSymbol />{price.toFixed(2)}
          </p>
        ) : (
          <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-gray-400 line-through text-sm flex items-center gap-0.5"><SARSymbol />{original.toFixed(2)}</span>
            <span className="text-[#0205A6] font-bold text-base flex items-center gap-0.5"><SARSymbol />{price.toFixed(2)}</span>
          </div>
        )}

        {/* Button */}
        {isQuotation ? (
          <button
            onClick={e => { e.stopPropagation(); onProductClick(); }}
            aria-label={`Get quotation for ${product.name}`}
            className="mt-3 w-full bg-[#0D1637] hover:bg-[#0a1128] text-white font-semibold text-sm py-3 rounded-xl transition-colors">
            {t('productsGetQuotation')}
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={cartLoading || product.stock === 0}
            aria-label={`Add ${product.name} to cart`}
            className="mt-3 w-full bg-[#F97316] hover:bg-[#e8650a] text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <ShoppingCart size={15} />
            {t('productsAddToCart')}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(product);
          }}
          className={`mt-2 w-full border text-sm font-semibold py-2.5 rounded-xl transition-colors ${
            isCompared
              ? 'border-[#0205A6] text-[#0205A6] bg-[#0205A6]/5'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isCompared ? t('productsCompareRemove') : t('productsCompareAdd')}
        </button>
      </div>
    </div>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
// Rendered at page level (outside card DOM) — zero event-propagation issues.
function ProductDetailModal({
  product, tab, t, isRTL, isAuthenticated, onClose,
}: {
  product: Product; tab: Tab; t: (k: string) => string; isRTL: boolean;
  isAuthenticated: boolean; onClose: () => void;
}) {
  const rawImage = resolveProductImage(product);
  const image    = getImageUrl(rawImage) ?? null;
  const [imgError, setImgError] = useState(false);
  const [qty, setQty] = useState(1);
  const price = Number(product.price);
  const isQuotation = tab === 'quotation';
  const badgeLabel = product.categoryName
    ? product.categoryName.replace(/filters?/i, '').trim().toUpperCase() || product.categoryName.toUpperCase()
    : null;
  const productName = resolveProductName(product, isRTL ? 'ar' : 'en');
  const productDescription = resolveProductDescription(product, isRTL ? 'ar' : 'en');
  const modalTitle = t('productsDetailTitle');
  const resolvedModalTitle = modalTitle && modalTitle !== 'productsDetailTitle'
    ? modalTitle
    : 'Product Detail';

  const router = useRouter();
  const { addItem, loading: cartLoading } = useCart();
  const { addItem: addToQuotation } = useQuotation();

  // Lock body scroll while open
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/products');
      router.push('/login');
      return;
    }
    addItem(product.id, 1, {
      id: product.id, name: productName, thumbnail: rawImage,
    }, price);
    onClose();
  };

  const handleAddToQuotation = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/products');
      router.push('/login');
      return;
    }
    addToQuotation({
      productId: product.id, name: productName, sku: product.sku,
      price, quantity: qty, thumbnail: rawImage,
    });
    toast.success(`${productName} ${t('products.addedToQuotationBasket')}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop — safe to click without stopPropagation; modal is outside any card div */}
      <div className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-[90] overflow-y-auto p-4 sm:flex sm:items-center sm:justify-center">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col my-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">{resolvedModalTitle}</h2>
            <button onClick={onClose} aria-label="Close product details" className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Modal body */}
          <div className="overflow-y-auto">
            {/* Image */}
            <div className="relative h-44 sm:h-56 bg-white overflow-hidden">
              {image && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={product.name} className="w-full h-full object-contain object-center" onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageOff size={40} className="text-gray-300" />
                  <span className="text-xs text-gray-400 font-medium">{t('productsNoImage') || 'No Image'}</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="px-6 py-4 space-y-3">
              {/* Badge + SKU row */}
              <div className="flex items-center justify-between">
                {badgeLabel && (
                  <span className="inline-flex border border-gray-300 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wider">
                    {badgeLabel}
                  </span>
                )}
                {(product.filterNumber || product.sku) && (
                  <span className="text-gray-400 text-xs font-medium">{product.filterNumber ?? product.sku}</span>
                )}
              </div>

              {/* Name */}
              <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{productName}</h3>

              {/* Description */}
              {productDescription && (
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{productDescription}</p>
              )}

              {/* Filter Type / Material / Dimensions */}
              {(product.filterType || product.material || product.dimensions) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {product.filterType && <span><span className="font-semibold text-gray-700">{PRODUCT_UI_LABELS.type}</span> {product.filterType}</span>}
                  {product.material   && <span><span className="font-semibold text-gray-700">{PRODUCT_UI_LABELS.material}</span> {product.material}</span>}
                  {product.dimensions && <span><span className="font-semibold text-gray-700">{PRODUCT_UI_LABELS.dimensions}</span> {product.dimensions}</span>}
                </div>
              )}

              {/* Price + Stock */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-2xl font-extrabold text-[#0205A6] flex items-center gap-1">
                  <SARSymbol />{price.toFixed(2)}
                </span>
                {product.stock !== undefined && product.stock !== null && (
                  <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {product.stock === 0 ? t('productsOutOfStock') : `${product.stock} ${t('productsInStock') || 'in stock'}`}
                  </span>
                )}
              </div>

              {/* Quotation qty */}
              {isQuotation && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <Minus size={14} />
                  </button>
                  <input type="number" min={1} value={qty}
                    aria-label="Quantity"
                    onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border border-gray-200 rounded-xl py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D1637]/20 focus:border-[#0D1637]" />
                  <button type="button" onClick={() => setQty(q => q + 1)}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                    <Plus size={14} />
                  </button>
                  <span className="text-xs text-gray-400 ml-1">
                    Total: <span className="font-bold text-gray-700"><SARSymbol className="inline" />{(price * qty).toFixed(2)}</span>
                  </span>
                </div>
              )}

              {/* CTA */}
              {isQuotation ? (
                <button
                  onClick={handleAddToQuotation}
                  disabled={product.stock === 0}
                  className="w-full bg-[#0D1637] hover:bg-[#0a1128] text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Download size={14} />
                  {t('productsGetQuotation')}
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading || product.stock === 0}
                  className="w-full bg-[#F97316] hover:bg-[#e8650a] text-white font-bold text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ShoppingCart size={16} />
                  {t('productsAddToCart')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-2" />
        <div className="h-9 bg-gray-200 rounded-full mt-2" />
      </div>
    </div>
  );
}

// ── Active Filter Badges ──────────────────────────────────────────────────────
function ActiveFilterBadges({ filters, categories, onRemove, t, isRTL }: {
  filters: ActiveFilters; categories: Category[];
  onRemove: (key: keyof ActiveFilters) => void;
  t: (k: string) => string; isRTL: boolean;
}) {
  const badges: { key: keyof ActiveFilters; label: string }[] = [];

  if (filters.search)     badges.push({ key: 'search',     label: `"${filters.search}"` });
  if (filters.categoryId) {
    const cat = categories.find(c => c.id === filters.categoryId);
    if (cat) badges.push({ key: 'categoryId', label: `${t('productsCategory')}: ${cat.name}` });
  }
  if (filters.minPrice || filters.maxPrice)
    badges.push({ key: 'minPrice', label: `${t('productsPriceRange')}: ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}` });
  if (filters.inStock)    badges.push({ key: 'inStock',    label: t('productsInStockOnly') });
  if (filters.sort) {
    const opt = PRODUCTS_SORT_OPTIONS.find(o => o.value === filters.sort);
    if (opt) badges.push({ key: 'sort', label: `${t('productsSortBy')}: ${t(opt.labelKey)}` });
  }
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span className="text-sm text-gray-500">{t('productsActiveFilters')}</span>
      {badges.map(b => (
        <button key={b.key} onClick={() => onRemove(b.key)}
          aria-label={`Remove filter ${b.label}`}
          className="flex items-center gap-1.5 bg-[#0205A6]/10 text-[#0205A6] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors group">
          {b.label}
          <X size={12} className="group-hover:text-red-600" />
        </button>
      ))}
    </div>
  );
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
function FilterPanel({ open, onClose, categories, draft, setDraft, onApply, onClear, t, isRTL }: {
  open: boolean; onClose: () => void; categories: Category[];
  draft: ActiveFilters; setDraft: React.Dispatch<React.SetStateAction<ActiveFilters>>;
  onApply: () => void; onClear: () => void;
  t: (k: string) => string; isRTL: boolean;
}) {
  useEffect(() => {
    if (open) {
      // Compensate for scrollbar disappearing to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [open]);

  if (!open) return null;

  const field = (key: keyof ActiveFilters, value: string | boolean) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — bottom drawer on mobile, right side panel on md+ */}
      <div className={`fixed z-50 bg-white shadow-2xl flex flex-col overflow-hidden
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]
        md:bottom-auto md:top-0 md:right-0 md:left-auto md:h-full md:w-96 md:rounded-none md:rounded-l-2xl
        ${isRTL ? 'md:right-auto md:left-0 md:rounded-r-2xl md:rounded-l-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('productsFilterTitle')}
        dir={isRTL ? 'rtl' : 'ltr'}
      >

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-lg font-bold text-gray-900">{t('productsFilterTitle')}</h2>
          <button onClick={onClose} aria-label="Close filters" className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-7">

          {/* Sort */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">{t('productsSortBy')}</label>
            <div className="space-y-2">
              {PRODUCTS_SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => field('sort', draft.sort === opt.value ? '' : opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                    ${draft.sort === opt.value
                      ? 'bg-[#0205A6] text-white border-[#0205A6]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#0205A6] hover:text-[#0205A6]'}`}>
                  {t(opt.labelKey)}
                  {draft.sort === opt.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">{t('productsCategory')}</label>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">

                {/* All Filters option */}
                <label className="flex items-center gap-3 px-2 py-2 cursor-pointer group">
                  <input type="radio" className="sr-only" checked={draft.categoryId === ''}
                    onChange={() => field('categoryId', '')} />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${draft.categoryId === '' ? 'border-[#0205A6]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {draft.categoryId === '' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0205A6]" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${draft.categoryId === '' ? 'text-[#0205A6]' : 'text-gray-700'}`}>
                    {t('productsAllFilters')}
                  </span>
                </label>

                {/* Individual categories */}
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 px-2 py-2 cursor-pointer group">
                    <input type="radio" className="sr-only" checked={draft.categoryId === cat.id}
                      onChange={() => field('categoryId', cat.id)} />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${draft.categoryId === cat.id ? 'border-[#0205A6]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {draft.categoryId === cat.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0205A6]" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${draft.categoryId === cat.id ? 'text-[#0205A6]' : 'text-gray-700'}`}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">{t('productsPriceRange')}</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-3">
              <input type="number" min={0} placeholder={t('productsMinPrice')} value={draft.minPrice}
                aria-label={t('productsMinPrice')}
                onChange={e => field('minPrice', e.target.value)}
                className="w-full min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0205A6]/30 focus:border-[#0205A6]" />
              <span className="hidden sm:flex items-center justify-center text-gray-400 text-sm shrink-0">—</span>
              <input type="number" min={0} placeholder={t('productsMaxPrice')} value={draft.maxPrice}
                aria-label={t('productsMaxPrice')}
                onChange={e => field('maxPrice', e.target.value)}
                className="w-full min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0205A6]/30 focus:border-[#0205A6]" />
            </div>
          </div>

          {/* In Stock Toggle */}
          <div className={`rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : ''}`}>
              <p className="text-sm font-bold text-gray-800">{t('productsInStockOnly')}</p>
              <p className="text-xs leading-5 text-gray-400 mt-0.5">{t('productsInStockDesc')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.inStock}
              aria-label={t('productsInStockOnly')}
              onClick={() => field('inStock', !draft.inStock)}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-[#0205A6]/20 ${draft.inStock ? 'bg-[#0205A6]' : 'bg-gray-300'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ${draft.inStock ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={onClear}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            {t('productsClearFilters')}
          </button>
          <button onClick={onApply}
            className="flex-1 py-3 rounded-xl bg-[#0205A6] text-white text-sm font-semibold hover:bg-[#0103d4] transition-colors">
            {t('productsApplyFilters')}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page Skeleton ─────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-16">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded-xl w-1/3 mx-auto" />
          <div className="h-5  bg-gray-100 rounded w-1/2 mx-auto" />
          <div className="h-12 bg-gray-200 rounded-2xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Products Content (needs Suspense because of useSearchParams) ──────────────
function ProductsContent() {
  const { t, isRTL, locale } = useLanguage();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab]   = useState<Tab>(searchParams.get('type') === 'quotation' ? 'quotation' : 'buy');
  const [page,      setPage]        = useState(Number(searchParams.get('page') || 1));

  const emptyFilters: ActiveFilters = {
    search:     searchParams.get('search')     || '',
    categoryId: searchParams.get('categoryId') || '',
    minPrice:   searchParams.get('minPrice')   || '',
    maxPrice:   searchParams.get('maxPrice')   || '',
    inStock:    searchParams.get('inStock')    === 'true',
    sort:       searchParams.get('sort')       || '',
  };

  const [appliedFilters, setAppliedFilters] = useState<ActiveFilters>(emptyFilters);
  const [draftFilters,   setDraftFilters]   = useState<ActiveFilters>(emptyFilters);
  const [searchInput,    setSearchInput]    = useState(emptyFilters.search);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [detailProduct, setDetailProduct]   = useState<Product | null>(null);

  const [comparedProducts, setComparedProducts] = useState<ComparedProductItem[]>([]);
  const [showCompareTable, setShowCompareTable] = useState(false);

  const {
    products,
    total,
    loading,
    categories,
  } = useProductsCatalog({
    filters: appliedFilters,
    page,
    locale: locale || 'en',
  });

  // Single Zustand subscription at the page level — passed down as a plain prop
  // so individual ProductCards don't each create their own store subscription.
  const { isAuthenticated } = useAuthStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setComparedProducts(productComparisonService.getAll());
  }, []);

  const handleToggleCompare = (product: Product) => {
    const currentlyCompared = productComparisonService.isCompared(product.id);

    if (currentlyCompared) {
      productComparisonService.remove(product.id);
      setComparedProducts(productComparisonService.getAll());
      toast.success(t('products.compareRemoved'));
      return;
    }

    const result = productComparisonService.add({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      sku: product.sku,
      thumbnail: product.mainImage ?? product.images?.[0] ?? null,
      filterType: product.filterType,
      material: product.material,
      dimensions: product.dimensions,
    });

    if (!result.ok && result.reason === 'limit_reached') {
      toast.error(`${t('products.compareLimitPrefix')} ${productComparisonService.maxItems} ${t('products.compareLimitSuffix')}`);
      return;
    }

    setComparedProducts(productComparisonService.getAll());
    toast.success(t('products.compareAdded'));
  };

  // ── URL sync ──────────────────────────────────────────────────────────────
  const syncURL = useCallback((filters: ActiveFilters, p: number, tab: Tab) => {
    const params = new URLSearchParams();
    if (filters.search)     params.set('search',     filters.search);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.minPrice)   params.set('minPrice',   filters.minPrice);
    if (filters.maxPrice)   params.set('maxPrice',   filters.maxPrice);
    if (filters.inStock)    params.set('inStock',    'true');
    if (filters.sort)       params.set('sort',       filters.sort);
    if (tab === 'quotation') params.set('type', 'quotation');
    if (p > 1)              params.set('page', String(p));
    router.push(`/products?${params.toString()}`, { scroll: false });
  }, [router]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab); setPage(1); syncURL(appliedFilters, 1, tab);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const updated = { ...appliedFilters, search: value };
      setAppliedFilters(updated); setDraftFilters(updated);
      setPage(1); syncURL(updated, 1, activeTab);
    }, 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const updated = { ...appliedFilters, search: searchInput };
      setAppliedFilters(updated); setDraftFilters(updated);
      setPage(1); syncURL(updated, 1, activeTab);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setSearchInput(draftFilters.search);
    setPage(1); setFilterOpen(false);
    syncURL(draftFilters, 1, activeTab);
  };

  const handleClearFilters = () => {
    const cleared: ActiveFilters = { search: '', categoryId: '', minPrice: '', maxPrice: '', inStock: false, sort: '' };
    setDraftFilters(cleared); setAppliedFilters(cleared);
    setSearchInput(''); setPage(1); setFilterOpen(false);
    syncURL(cleared, 1, activeTab);
  };

  const handleRemoveBadge = (key: keyof ActiveFilters) => {
    const updated = { ...appliedFilters };
    if (key === 'minPrice')      { updated.minPrice = ''; updated.maxPrice = ''; }
    else if (key === 'inStock')  { updated.inStock = false; }
    else {
      if (key === 'search' || key === 'categoryId' || key === 'sort') {
        updated[key] = '';
      }
    }
    setAppliedFilters(updated); setDraftFilters(updated);
    if (key === 'search') setSearchInput('');
    setPage(1); syncURL(updated, 1, activeTab);
  };

  const handlePageChange = (p: number) => {
    setPage(p); syncURL(appliedFilters, p, activeTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [
    appliedFilters.categoryId,
    appliedFilters.minPrice || appliedFilters.maxPrice,
    appliedFilters.inStock,
    appliedFilters.sort,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Heading */}
          <div className="text-center mb-10 space-y-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              {t('productsPageTitle')}
            </h1>
            <p className="text-gray-500 text-base sm:text-lg">{t('productsPageSubtitle')}</p>
          </div>

          {/* Search + Tab bar */}
          <div className={`flex flex-col lg:flex-row lg:items-center gap-2.5 mb-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
            <div className="relative w-full lg:max-w-[430px] xl:max-w-[460px]">
              <Search size={18} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-4' : 'left-4'}`} />
              <input type="text" value={searchInput}
                aria-label={t('productsSearchPlaceholder')}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('productsSearchPlaceholder')}
                className={`w-full h-[50px] bg-white border border-[#D4D7DE] rounded-full py-2.5 text-sm text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-[#0205A6]/30 focus:border-[#0205A6] transition-colors
                  ${isRTL ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10'}`} />
              {searchInput && (
                <button onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                  className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className={`flex-1 h-[50px] flex items-center bg-white border border-[#E2E8F0] rounded-[14px] px-1.5 gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {([['buy', 'productsTabBuy'], ['quotation', 'productsTabQuotation']] as const).map(([tab, key]) => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  aria-pressed={activeTab === tab}
                  className={`flex-1 h-[38px] text-sm font-semibold rounded-full transition-all duration-200
                    ${activeTab === tab ? 'bg-[#F4F7FB] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F8FAFC]'}`}>
                  {t(key)}
                </button>
              ))}
              <button onClick={() => { setDraftFilters(appliedFilters); setFilterOpen(true); }}
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                aria-label={t('productsFilterAll')}
                className={`flex items-center gap-1.5 h-[38px] rounded-full px-4 text-sm font-semibold border transition-colors whitespace-nowrap ml-auto
                  ${activeFilterCount > 0 ? 'bg-[#0205A6] text-white border-[#0205A6]' : 'bg-[#F8FAFC] text-gray-700 border-[#E2E8F0] hover:bg-gray-100'}`}>
                {t('productsFilterAll')}
                <Filter size={14} className={activeFilterCount > 0 ? 'text-white' : 'text-gray-500'} />
                {activeFilterCount > 0 && (
                  <span className="bg-white text-[#0205A6] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active badges */}
          <ActiveFilterBadges filters={appliedFilters} categories={categories}
            onRemove={handleRemoveBadge} t={t} isRTL={isRTL} />

          {/* Results count */}
          {!loading && (
            <p className={`text-sm text-gray-500 mb-5 ${isRTL ? 'text-right' : ''}`}>
              {total} {t('productsResults')}
            </p>
          )}

          {/* Grid */}
          {comparedProducts.length > 0 && (
            <div className="mb-4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">{t('productsCompareLabel')}</span>
              {comparedProducts.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                  {item.name}
                  <button
                    type="button"
                    onClick={() => {
                      productComparisonService.remove(item.id);
                      const next = productComparisonService.getAll();
                      setComparedProducts(next);
                      if (next.length < 2) {
                        setShowCompareTable(false);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={`Remove ${item.name} from compare`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompareTable((v) => !v)}
                  disabled={comparedProducts.length < 2}
                  className="text-xs bg-[#0205A6] text-white font-semibold px-3 py-1.5 rounded-full hover:bg-[#0103d4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showCompareTable ? t('productsCompareHideTable') : t('productsCompareShowTable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    productComparisonService.clear();
                    setComparedProducts([]);
                    setShowCompareTable(false);
                  }}
                  className="text-xs text-[#0205A6] font-semibold hover:underline"
                >
                  {t('productsCompareClear')}
                </button>
              </div>
            </div>
          )}

          {showCompareTable && comparedProducts.length >= 2 && (
            <div className="mb-6 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">{t('productsComparisonTitle')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('productsComparisonField')}</th>
                      {comparedProducts.map((item) => (
                        <th key={item.id} className={`px-4 py-3 font-semibold text-gray-900 min-w-[220px] ${isRTL ? 'text-right' : 'text-left'}`}>{item.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonPrice')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-price`} className="px-4 py-3 text-[#0205A6] font-bold">SAR {item.price.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonSku')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-sku`} className="px-4 py-3 text-gray-700">{item.sku || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonFilterType')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-type`} className="px-4 py-3 text-gray-700">{item.filterType || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonMaterial')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-material`} className="px-4 py-3 text-gray-700">{item.material || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonDimensions')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-dimensions`} className="px-4 py-3 text-gray-700">{item.dimensions || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700">{t('productsComparisonAction')}</td>
                      {comparedProducts.map((item) => (
                        <td key={`${item.id}-action`} className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/products/${item.id}`)}
                            className="text-xs font-semibold text-[#0205A6] hover:underline"
                          >
                            {t('productsComparisonViewProduct')}
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: PRODUCTS_ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)
              : products.length === 0
                ? (
                    <div className="col-span-3 text-center py-24 space-y-4">
                      <p className="text-gray-500 text-lg">{t('productsNoResultsFiltered')}</p>
                      {activeFilterCount > 0 && (
                        <button onClick={handleClearFilters}
                          className="inline-flex items-center gap-2 bg-[#0205A6] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#0103d4] transition-colors">
                          <X size={14} />{t('productsClearFilters')}
                        </button>
                      )}
                    </div>
                  )
                : products.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      tab={activeTab}
                      t={t}
                      isRTL={isRTL}
                      isAuthenticated={isAuthenticated}
                      onProductClick={() => setDetailProduct(p)}
                      isCompared={comparedProducts.some((item) => item.id === p.id)}
                      onToggleCompare={handleToggleCompare}
                    />
                  ))
            }
          </div>

          {/* Pagination */}
          {!loading && (
            <div className="mt-10">
              <UnifiedPagination
                page={page}
                totalPages={Math.max(1, Math.ceil(total / PRODUCTS_ITEMS_PER_PAGE))}
                totalItems={total}
                pageSize={PRODUCTS_ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
                isRTL={isRTL}
              />
            </div>
          )}
        </div>
      </main>

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          tab={activeTab}
          t={t}
          isRTL={isRTL}
          isAuthenticated={isAuthenticated}
          onClose={() => setDetailProduct(null)}
        />
      )}

      <LandingFooter />

      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} categories={categories}
        draft={draftFilters} setDraft={setDraftFilters}
        onApply={handleApplyFilters} onClear={handleClearFilters}
        t={t} isRTL={isRTL} />
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────
export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}
