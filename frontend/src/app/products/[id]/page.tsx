'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ShoppingCart, Download, Heart, Share2, ImageOff, Star, Loader } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useQuotation } from '@/contexts/QuotationContext';
import { getImageUrl } from '@/utils/helpers';
import SARSymbol from '@/components/SARSymbol';
import { useAuthStore } from '@/store/auth.store';
import { useProduct } from '@/hooks/useProduct';
import { useProductReviews } from '@/hooks/useProductReviews';

/**
 * Product Detail Page — /products/[id]
 * ─────────────────────────────────────────────────────────────────────────
 * Full product view with gallery, specifications, reviews, and related products.
 * Includes add-to-cart and quotation request functionality.
 */


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();
  const { user } = useAuthStore();
  const { addItem: addToCart, loading: cartLoading } = useCart();
  const { addItem: addToQuotation } = useQuotation();

  const productId = params.id as string;

  const { product, relatedProducts, loading, error } = useProduct(productId, locale || 'en');
  const {
    reviews,
    loading: reviewsLoading,
    averageRating,
    reviewCount,
  } = useProductReviews(productId);

  // State
  const [imageError, setImageError] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews'>('specs');
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(t('productsLoadError') || 'Failed to load product');
    }
  }, [error, t]);

  if (loading) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader size={40} className="text-[#0205A6] animate-spin" />
        </div>
        <LandingFooter />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('productsNotFound') || 'Product not found'}</h1>
          <Link href="/products" className="text-[#0205A6] hover:underline font-semibold">
            ← {t('productsBackToList') || 'Back to products'}
          </Link>
        </div>
        <LandingFooter />
      </>
    );
  }

  const images = [product.mainImage, ...(product.images || [])].filter(Boolean);
  const currentImage = images[selectedImageIndex] ? getImageUrl(images[selectedImageIndex]) : null;
  const price = Number(product.price);
  const originalPrice = Number(product.originalPrice ?? price * 1.2);
  const discount = Math.round((1 - price / originalPrice) * 100);
  const attachments = product.attachments || [];
  const datasheets = attachments.filter((a) => a.type === 'DATASHEET');
  const certificates = attachments.filter((a) => a.type === 'CERTIFICATE');
  const categoryName = product.categoryName
    ?.replace(/filters?/i, '')
    .trim()
    .toUpperCase() || product.category?.name?.toUpperCase();
  const maxQuantity = product.stock && product.stock > 0 ? product.stock : null;
  const detailLabels = {
    specs: t('productsSpecs') || 'Specifications',
    qty: t('productsQty') || 'Quantity',
    filterType: t('productsDetailFilterType') || 'Filter Type',
    material: t('productsDetailMaterial') || 'Material',
    dimensions: t('productsDetailDimensions') || 'Dimensions',
    alternateNumbers: t('productsDetailAlternateNumbers') || 'Alternate Numbers',
    noSpecs: t('productsDetailNoSpecs') || 'No specs available',
    whyChoose: t('productsWhyChooseThisProduct') || 'Why Choose This Product?',
    qualityAssurance: t('productsQualityAssurance') || 'Quality Assurance',
    certifications: t('productsCertificationsDocumentation') || 'Certifications & Documentation',
    datasheetUnavailable: t('productsDatasheetUnavailable') || 'Datasheet not available for this product.',
    productCertification: t('productsProductCertification') || 'Product Certification',
    download: t('productsDownload') || 'Download',
    reviews: t('productsReviews') || 'Reviews',
    reviewsLoading: t('productsReviewsLoading') || 'Loading reviews...',
    noApprovedReviews: t('productsNoApprovedReviews') || 'No approved reviews yet. Be the first to review this product!',
    writeReview: t('productsWriteReview') || 'Write a Review',
    anonymous: t('productsAnonymous') || 'Anonymous',
    inStock: t('productsInStock') || 'in stock',
    outOfStock: t('productsOutOfStock') || 'Out of Stock',
  };

  const normalizeQuantity = (nextQuantity: number) => {
    if (maxQuantity === null) {
      return Math.max(1, nextQuantity);
    }

    return Math.max(1, Math.min(nextQuantity, maxQuantity));
  };

  const handleAddToCart = () => {
    if (!user) {
      sessionStorage.setItem(
        'post_login_redirect',
        typeof window !== 'undefined' ? window.location.pathname : '/products'
      );
      router.push('/login');
      return;
    }
    const normalizedQuantity = normalizeQuantity(quantity);

    addToCart(product.id, normalizedQuantity, {
      id: product.id,
      name: product.name,
      thumbnail: product.mainImage || null,
    }, price);
    toast.success(`${normalizedQuantity} ${t('products.itemsAddedToCart')}`);
  };

  const handleRequestQuote = () => {
    if (!user) {
      sessionStorage.setItem(
        'post_login_redirect',
        typeof window !== 'undefined' ? window.location.pathname : '/products'
      );
      router.push('/login');
      return;
    }
    addToQuotation({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price,
      quantity,
      thumbnail: product.mainImage || null,
    });
    toast.success(`${t('products.quoteRequestSubmittedFor')} "${product.name}"`);
  };

  return (
    <>
      <LandingNavbar />
      
      <main className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/products"
            className="flex items-center gap-2 text-[#0205A6] hover:underline font-semibold text-sm"
          >
            <ChevronLeft size={16} />
            {t('productsBackToList') || 'Back to products'}
          </Link>
        </div>

        {/* Product Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            {/* ── Image Gallery ── */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer">
                {currentImage && !imageError ? (
                  <img
                    src={currentImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-100">
                    <ImageOff size={48} className="text-gray-300" />
                    <span className="text-sm text-gray-400 font-medium">{t('productsNoImage') || 'No Image'}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white font-bold text-sm px-3 py-1.5 rounded-full">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className={`flex gap-3 overflow-x-auto pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {images.map((img, idx) => {
                    const thumbUrl = getImageUrl(img);
                    return (
                      <button
                        key={idx}
                        onClick={() => { setSelectedImageIndex(idx); setImageError(false); }}
                        aria-label={`View image ${idx + 1} for ${product.name}`}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === selectedImageIndex
                            ? 'border-[#0205A6] ring-2 ring-[#0205A6]/50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <ImageOff size={16} className="text-gray-300" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Product Info ── */}
            <div className="space-y-6 animate-fade-in animation-delay-100">
              {/* Category Badge */}
              {categoryName && (
                <div className={`flex items-center gap-2 ${isRTL ? 'justify-end' : ''}`}>
                  <span className="inline-block bg-[#F97316]/10 text-[#F97316] text-xs font-bold px-3 py-1 rounded-full">
                    {categoryName}
                  </span>
                </div>
              )}

              {/* Title & Meta */}
              <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{product.name}</h1>
                {(product.filterNumber || product.sku) && (
                  <p className="text-gray-500 text-sm">
                    {product.filterNumber ? `#${product.filterNumber}` : product.sku}
                  </p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">({(averageRating || 0).toFixed(1)} • {reviewCount} {detailLabels.reviews.toLowerCase()})</span>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className={`flex items-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-4xl font-black text-[#0205A6] flex items-center gap-1">
                    <SARSymbol /> {price.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-400 line-through flex items-center gap-1">
                    <SARSymbol /> {originalPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-green-600 font-semibold text-sm">
                  {product.stock === 0 ? `❌ ${detailLabels.outOfStock}` : `✅ ${product.stock} ${detailLabels.inStock}`}
                </p>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-gray-600 text-base leading-relaxed">{product.description}</p>
              )}

              {/* Specifications Preview */}
              <div className={`space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200 ${isRTL ? 'text-right' : ''}`}>
                <h3 className="font-bold text-gray-900 text-sm">{detailLabels.specs}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {product.filterType && (
                    <p className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-gray-700">{detailLabels.filterType}</span>
                      <span>{product.filterType}</span>
                    </p>
                  )}
                  {product.material && (
                    <p className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-gray-700">{detailLabels.material}</span>
                      <span>{product.material}</span>
                    </p>
                  )}
                  {product.dimensions && (
                    <p className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-gray-700">{detailLabels.dimensions}</span>
                      <span>{product.dimensions}</span>
                    </p>
                  )}
                  {product.alternateNumbers && (
                    <p className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-gray-700">{detailLabels.alternateNumbers}</span>
                      <span>{product.alternateNumbers}</span>
                    </p>
                  )}
                  {!product.filterType && !product.material && !product.dimensions && !product.alternateNumbers && (
                    <p className="text-gray-400 italic">{detailLabels.noSpecs}</p>
                  )}
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-3">
                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700">{detailLabels.qty}</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => normalizeQuantity(q - 1))}
                      aria-label="Decrease quantity"
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQuantity ?? undefined}
                      value={quantity}
                      aria-label="Quantity"
                      onChange={e => setQuantity(normalizeQuantity(parseInt(e.target.value) || 1))}
                      className="w-12 text-center border-l border-r border-gray-300 py-2 focus:outline-none font-semibold"
                    />
                    <button
                      onClick={() => setQuantity(q => normalizeQuantity(q + 1))}
                      aria-label="Increase quantity"
                      disabled={maxQuantity !== null && quantity >= maxQuantity}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Primary Buttons */}
                <div className="grid md:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={cartLoading || product.stock === 0}
                    aria-label={`Add ${product.name} to cart`}
                    className="w-full bg-gradient-to-r from-[#F97316] to-orange-500 hover:from-orange-500 hover:to-[#F97316] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    <ShoppingCart size={20} />
                    {t('productsAddToCart') || 'Add to Cart'}
                  </button>

                  <button
                    onClick={handleRequestQuote}
                    aria-label={`Request quotation for ${product.name}`}
                    className="w-full bg-[#0205A6] hover:bg-[#0307c4] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Download size={20} />
                    {t('productsGetQuote') || 'Request Quote'}
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button aria-label={`Save ${product.name} to wishlist`} className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Heart size={18} />
                    {t('productsWishlist') || 'Save'}
                  </button>
                  <button aria-label={`Share ${product.name}`} className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Share2 size={18} />
                    {t('productsShare') || 'Share'}
                  </button>
                </div>
              </div>

              {/* Key Benefits */}
              <div className={`space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-lg ${isRTL ? 'text-right' : ''}`}>
                <h4 className="font-bold text-gray-900 text-sm">{detailLabels.whyChoose}</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ Premium quality industrial filter</li>
                  <li>✓ Fast delivery available</li>
                  <li>✓ Bulk order discounts</li>
                  <li>✓ Extended warranty options</li>
                </ul>
              </div>

              {/* Certifications & Documentation */}
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <h4 className="font-bold text-gray-900 text-sm">{detailLabels.certifications}</h4>
                <div className={`flex gap-2 flex-wrap ${isRTL ? 'justify-end' : ''}`}>
                  {certificates.length > 0 ? (
                    certificates.map((certificate) => (
                      <a
                        key={certificate.id}
                        href={getImageUrl(certificate.fileUrl) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full border border-green-200 hover:bg-green-100"
                      >
                        ✓ {certificate.fileName}
                      </a>
                    ))
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full border border-green-200">
                        ✓ ISO 9001:2015
                      </span>
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full border border-blue-200">
                        ✓ CE Certified
                      </span>
                    </>
                  )}
                </div>
                {datasheets.length > 0 ? (
                  <div className="space-y-1">
                    {datasheets.map((datasheet) => (
                      <a
                        key={datasheet.id}
                        href={getImageUrl(datasheet.fileUrl) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#0205A6] hover:underline font-medium flex items-center gap-1"
                      >
                        <Download size={14} />
                        {detailLabels.download} {datasheet.fileName}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">{detailLabels.datasheetUnavailable}</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Certifications Banner ── */}
          <div className={`mt-12 bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200 ${isRTL ? 'text-right' : ''}`}>
            <h3 className="font-bold text-gray-900 mb-4">{detailLabels.qualityAssurance}</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {(certificates.length > 0 ? certificates : [
                { id: 'iso', fileName: 'ISO 9001', fileUrl: '#', type: 'CERTIFICATE' as const, mimeType: 'text/plain', language: 'en' },
                { id: 'ce', fileName: 'CE Mark', fileUrl: '#', type: 'CERTIFICATE' as const, mimeType: 'text/plain', language: 'en' },
                { id: 'rohs', fileName: 'RoHS', fileUrl: '#', type: 'CERTIFICATE' as const, mimeType: 'text/plain', language: 'en' },
                { id: 'warranty', fileName: 'Warranty', fileUrl: '#', type: 'CERTIFICATE' as const, mimeType: 'text/plain', language: 'en' },
              ]).slice(0, 4).map((certificate) => (
                <div key={certificate.id} className="text-center">
                  <div className="text-sm font-semibold text-gray-700">✓ {certificate.fileName}</div>
                  <p className="text-xs text-gray-500 mt-1">{detailLabels.productCertification}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Details Tabs ── */}
          <div className="mt-16 border-t border-gray-200 pt-8">
            <div className={`flex gap-6 border-b border-gray-200 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 font-semibold text-sm transition-colors ${
                  activeTab === 'specs'
                    ? 'text-[#0205A6] border-b-2 border-[#0205A6]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {detailLabels.specs}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 font-semibold text-sm transition-colors ${
                  activeTab === 'reviews'
                    ? 'text-[#0205A6] border-b-2 border-[#0205A6]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {detailLabels.reviews} ({reviewCount})
              </button>
            </div>

            {activeTab === 'specs' && (
              <div className="space-y-4">
                {product.filterType && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{detailLabels.filterType}</h4>
                      <p className="text-gray-600">{product.filterType}</p>
                    </div>
                  </div>
                )}
                {product.material && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{detailLabels.material}</h4>
                      <p className="text-gray-600">{product.material}</p>
                    </div>
                  </div>
                )}
                {product.dimensions && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{detailLabels.dimensions}</h4>
                      <p className="text-gray-600">{product.dimensions}</p>
                    </div>
                  </div>
                )}
                {product.alternateNumbers && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{detailLabels.alternateNumbers}</h4>
                      <p className="text-gray-600">{product.alternateNumbers}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {/* Average Rating */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="text-4xl font-bold text-[#0205A6]">{(averageRating || 0).toFixed(1)}</div>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i < Math.round(averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Based on {reviewCount} reviews</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = reviews.filter((r) => r.rating === rating).length;
                            const width = reviewCount > 0 ? `${Math.round((count / reviewCount) * 100)}%` : '0%';
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-2">{rating}</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-400" style={{ width }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{review.authorName || detailLabels.anonymous}</h4>
                              <div className="flex gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-900 text-sm font-semibold mb-1">{review.title}</p>
                          <p className="text-gray-700 text-sm">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`bg-gray-50 p-6 rounded-lg text-center ${isRTL ? 'rtl' : ''}`}>
                    {reviewsLoading ? (
                      <p className="text-gray-600">{detailLabels.reviewsLoading}</p>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-4">{detailLabels.noApprovedReviews}</p>
                        {user && (
                          <button className="text-[#0205A6] hover:underline font-semibold">
                            {detailLabels.writeReview}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Related Products ── */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-200">
              <h2 className={`text-2xl font-bold text-gray-900 mb-8 ${isRTL ? 'text-right' : ''}`}>{t('productsRelated') || 'Related Products'}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((p, idx) => (
                  <Link key={p.id} href={`/products/${p.id}`} passHref>
                    <div className={`bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all cursor-pointer animate-fade-in`} style={{animationDelay: `${idx * 100}ms`}}>
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        {p.mainImage ? (
                          <img
                            src={getImageUrl(p.mainImage) || ''}
                            alt={p.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageOff size={32} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{p.name}</h4>
                        <p className="text-[#0205A6] font-bold text-base flex items-center gap-1">
                          <SARSymbol /> {Number(p.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
