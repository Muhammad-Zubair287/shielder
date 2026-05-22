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
  images?: Array<string | null | undefined>;
  attachments?: Array<ProductAttachmentLike | null | undefined>;
}

function findTranslation(product: ProductDisplayLike, locale: string): ProductTranslationLike | undefined {
  return product.translations?.find((translation) => translation.locale === locale || translation.language === locale);
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
      product[field] ||
      (field === 'name' ? product.nameEn : product.descriptionEn) ||
      englishValue ||
      anyTranslation?.[field] ||
      ''
    );
  }

  return (
    localeValue ||
    (field === 'name' ? product.nameEn : product.descriptionEn) ||
    englishValue ||
    product[field] ||
    (field === 'name' ? product.nameAr : product.descriptionAr) ||
    arabicValue ||
    anyTranslation?.[field] ||
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

  return (
    product.mainImage ||
    product.images?.[0] ||
    imageAttachment?.fileUrl ||
    product.attachments?.[0]?.fileUrl ||
    product.attachments?.[0]?.url ||
    null
  );
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
      ...(product.images || []),
      ...attachmentImages,
    ].filter((imageUrl): imageUrl is string => Boolean(imageUrl)))
  );
}
