import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

const productTranslationSchema = Joi.object({
  locale: Joi.string().required().length(2),
  name: sharedValidationSchemas.inventoryName.required().trim().max(200),
  description: sharedValidationSchemas.textNoHtml.optional().trim().max(5000),
});

const productSpecificationSchema = Joi.object({
  specKey: sharedValidationSchemas.textNoHtml.required().trim(),
  specValue: sharedValidationSchemas.textNoHtml.required().trim(),
});

const attachmentSchema = Joi.object({
  type: Joi.string().valid('IMAGE', 'DATASHEET', 'MANUAL', 'CERTIFICATE').required(),
  fileName: sharedValidationSchemas.textNoHtml.required(),
  fileUrl: Joi.string().uri().required(),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().min(0).required(),
  language: Joi.string().default('en'),
});

export const productValidation = {
  create: Joi.object({
    sku: Joi.string().optional().trim().max(50),
    categoryId: Joi.string().uuid().required(),
    subcategoryId: Joi.string().uuid().required(),
    warehouseId: Joi.string().uuid().optional(),
    brandId: Joi.string().uuid().optional(),
    supplierId: Joi.string().uuid().optional(),
    price: Joi.number().precision(2).positive().required(),
    stock: Joi.number().integer().min(0).default(0),
    minimumStockThreshold: Joi.number().integer().min(0).optional(),
    mainImage: Joi.string().optional(),
    filterNumber: Joi.string().optional().trim().max(100),
    alternateNumbers: Joi.string().optional().trim().max(500),
    filterType: Joi.string().optional().trim().max(100),
    material: Joi.string().optional().trim().max(200),
    dimensions: Joi.string().optional().trim().max(200),
    isActive: Joi.boolean().default(true),
    translations: Joi.array().items(productTranslationSchema).min(1).required(),
    specifications: Joi.array().items(productSpecificationSchema).optional(),
  }),
  update: Joi.object({
    sku: Joi.string().optional().trim().max(50),
    categoryId: Joi.string().uuid().optional(),
    subcategoryId: Joi.string().uuid().optional(),
    warehouseId: Joi.string().uuid().optional(),
    brandId: Joi.string().uuid().optional(),
    supplierId: Joi.string().uuid().optional(),
    price: Joi.number().precision(2).positive().optional(),
    stock: Joi.number().integer().min(0).optional(),
    minimumStockThreshold: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED').optional(),
    mainImage: Joi.string().optional(),
    filterNumber: Joi.string().optional().trim().max(100),
    alternateNumbers: Joi.string().optional().trim().max(500),
    filterType: Joi.string().optional().trim().max(100),
    material: Joi.string().optional().trim().max(200),
    dimensions: Joi.string().optional().trim().max(200),
    isActive: Joi.boolean().optional(),
    translations: Joi.array().items(productTranslationSchema).min(1).optional(),
    specifications: Joi.array().items(productSpecificationSchema).optional(),
  }),
  list: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    subcategoryId: Joi.string().uuid().optional(),
    brandId: Joi.string().uuid().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    inStock: Joi.string().valid('true', 'false').optional(),
    sort: Joi.string().valid('price_asc', 'price_desc', 'newest', 'best_selling').optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    locale: Joi.string().length(2).optional(),
  }).custom((value, helpers) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.maxPrice < value.minPrice
    ) {
      return helpers.error('any.invalid');
    }

    return value;
  }, 'price range validation').messages({
    'any.invalid': 'Maximum price must be greater than or equal to minimum price',
  }).unknown(true), // allow spec_... keys
  filters: Joi.object({
    locale: Joi.string().length(2).optional(),
  }),
  addAttachment: attachmentSchema,
  assignSpecifications: Joi.object({
    specifications: Joi.array().items(productSpecificationSchema).min(1).required(),
  }),
  bulkDelete: Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),
};
