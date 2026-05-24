export interface ProductTranslationLike {
  locale?: string;
  language?: string;
  name?: string;
  description?: string;
}

export interface ProductAttachmentLike {
  type?: string;
  fileUrl?: string;
  url?: string;
  mimeType?: string;
  language?: string;
}

export interface ProductDisplayLike {
  name?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  translations?: ProductTranslationLike[];
  mainImage?: string | null;
  main_image?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  images?: Array<string | null | undefined>;
  attachments?: Array<ProductAttachmentLike | null | undefined>;
}

function firstImageCandidate(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function findTranslation(product: ProductDisplayLike, locale: string): ProductTranslationLike | undefined {
  if (!product.translations || !locale) return undefined;
  const requested = locale.toLowerCase();
  return product.translations.find((translation) => {
    const tLocale = (translation.locale || translation.language || '').toLowerCase();
    if (!tLocale) return false;
    return tLocale === requested || tLocale.startsWith(requested) || requested.startsWith(tLocale);
  });
}

function resolveLocalizedText(
  product: ProductDisplayLike,
  locale: string,
  field: 'name' | 'description',
): string {
  const translation = findTranslation(product, locale);
  const englishTranslation = findTranslation(product, 'en');
  const arabicTranslation = findTranslation(product, 'ar');
  const anyTranslation = product.translations?.find((item) => Boolean(item?.[field]));

  const localeValue = translation?.[field];
  const englishValue = englishTranslation?.[field];
  const arabicValue = arabicTranslation?.[field];

  if (locale === 'ar') {
    return (
      localeValue ||
      (field === 'name' ? product.nameAr : product.descriptionAr) ||
      arabicValue ||
      (field === 'name' ? product.nameEn : product.descriptionEn) ||
      englishValue ||
      anyTranslation?.[field] ||
      product[field] ||
      ''
    );
  }

  return (
    localeValue ||
    (field === 'name' ? product.nameEn : product.descriptionEn) ||
    englishValue ||
    (field === 'name' ? product.nameAr : product.descriptionAr) ||
    arabicValue ||
    anyTranslation?.[field] ||
    product[field] ||
    ''
  );
}

export function resolveProductName(product: ProductDisplayLike, locale: string): string {
  return resolveLocalizedText(product, locale, 'name');
}

export function resolveProductDescription(product: ProductDisplayLike, locale: string): string {
  return resolveLocalizedText(product, locale, 'description');
}

export function resolveProductImage(product: ProductDisplayLike): string | null {
  const imageAttachment = product.attachments?.find((attachment) => {
    if (!attachment) return false;
    if (attachment.type === 'IMAGE') return true;
    return typeof attachment.mimeType === 'string' && attachment.mimeType.startsWith('image/');
  });

  return firstImageCandidate([
    product.mainImage,
    product.main_image,
    product.image,
    product.imageUrl,
    product.thumbnail,
    ...(product.images || []),
    imageAttachment?.fileUrl,
    imageAttachment?.url,
    product.attachments?.[0]?.fileUrl,
    product.attachments?.[0]?.url,
  ]);
}

export function resolveProductImages(product: ProductDisplayLike): string[] {
  const attachmentImages = (product.attachments || [])
    .filter((attachment) => {
      if (!attachment) return false;
      if (attachment.type === 'IMAGE') return true;
      return typeof attachment.mimeType === 'string' && attachment.mimeType.startsWith('image/');
    })
    .flatMap((attachment) => [attachment?.fileUrl, attachment?.url])
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  return Array.from(
    new Set([
      product.mainImage,
      product.main_image,
      product.image,
      product.imageUrl,
      product.thumbnail,
      ...(product.images || []),
      ...attachmentImages,
    ].filter((imageUrl): imageUrl is string => Boolean(imageUrl)))
  );
}
