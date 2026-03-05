import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { translate } from '@vitalets/google-translate-api';

/** Translate a string to Arabic. Returns the original text if translation fails. */
async function toArabic(text: string): Promise<string> {
  if (!text) return text;
  try {
    const { text: translated } = await translate(text, { to: 'ar' });
    return translated || text;
  } catch {
    return text;
  }
}

export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  brandId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  status?: ProductStatus;
  search?: string;
  page?: number;
  limit?: number;
  locale?: string;
}

export class ProductService {
  async create(data: {
    sku?: string;
    categoryId: string;
    subcategoryId: string;
    brandId?: string;
    supplierId?: string;
    price: number;
    stock: number;
    minimumStockThreshold?: number;
    mainImage?: string;
    translations: any[];
    specifications?: { specKey: string; specValue: string }[];
  }) {
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        brandId: data.brandId,
        supplierId: data.supplierId,
        price: data.price,
        stock: data.stock,
        minimumStockThreshold: data.minimumStockThreshold || 5,
        mainImage: data.mainImage,
        status: ProductStatus.PENDING,
        translations: {
          create: data.translations,
        },
        specifications: data.specifications ? {
          create: data.specifications.map(s => ({
            spec_key: s.specKey.trim(),
            spec_value: s.specValue.trim(),
            updated_at: new Date()
          })),
        } : undefined,
      },
      include: {
        translations: true,
        category: true,
        subcategory: true,
        brand: true,
        specifications: true,
      },
    });

    // Trigger notification for Admin regarding new product approval
    try {
      const NotificationService = (await import('../../notification/notification.service')).default;
      const { NotificationType, UserRole } = await import('@prisma/client');
      
      const productName = data.translations.find((t: any) => t.locale === 'en')?.name || 'New Product';

      await NotificationService.notify({
        type: NotificationType.SYSTEM_ALERT,
        title: 'Product Pending Approval',
        message: `A new product "${productName}" has been created and requires approval.`,
        module: 'INVENTORY',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: product.id
      });
    } catch (err) {
      console.error('Failed to create product approval notification:', err);
    }

    return product;
  }

  async getSummary() {
    const [totalProducts, activeProducts, pendingApproval, lowStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: ProductStatus.PUBLISHED, isActive: true } }),
      prisma.product.count({ where: { status: ProductStatus.PENDING } }),
      0 // Defaulting low stock count to 0 for now to avoid Prisma field-to-field comparison error
    ]);

    return {
      totalProducts,
      activeProducts,
      pendingApproval,
      lowStockProducts
    };
  }

  async getProductsForManagement(filters: ProductFilters) {
    const {
      categoryId,
      subcategoryId,
      brandId,
      supplierId,
      status,
      search,
      page = 1,
      limit = 10,
      locale = 'en',
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (brandId) where.brandId = brandId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        {
          translations: {
            some: {
              name: { contains: search, mode: 'insensitive' },
              locale,
            },
          },
        },
        {
          supplier: {
            profile: {
              fullName: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          translations: { where: { locale } },
          category: { 
            include: { translations: { where: { locale } } } 
          },
          subcategory: { 
            include: { translations: { where: { locale } } } 
          },
          brand: { 
            include: { brand_translations: { where: { locale } } } 
          },
          supplier: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { fullName: true }
              }
            }
          },
          _count: {
            select: { orderItems: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p: any) => ({
        ...p,
        name: p.translations[0]?.name || 'Unnamed Product',
        description: p.translations[0]?.description || '',
        categoryName: p.category?.translations[0]?.name || 'Unknown Category',
        subcategoryName: p.subcategory?.translations[0]?.name || 'Unknown Subcategory',
        supplierName: p.supplier?.profile?.fullName || p.supplier?.email || 'System'
      })),
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, locale?: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        translations: locale ? { where: { locale } } : true,
        category: { include: { translations: locale ? { where: { locale } } : true } },
        subcategory: { include: { translations: locale ? { where: { locale } } : true } },
        brand: { include: { brand_translations: locale ? { where: { locale } } : true } },
        supplier: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        },
        specifications: true,
        attachments: true,
      },
    });

    if (!product) throw new ApiError('Product not found', 404);
    
    // Format for easier frontend usage
    return {
      ...product,
      name: product.translations[0]?.name || 'Unnamed Product',
      description: product.translations[0]?.description || '',
    };
  }

  async update(id: string, data: any) {
    await this.getById(id);

    return await prisma.product.update({
      where: { id },
      data: {
        sku: data.sku,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        brandId: data.brandId,
        supplierId: data.supplierId,
        price: data.price,
        stock: data.stock,
        minimumStockThreshold: data.minimumStockThreshold,
        isActive: data.isActive,
        status: data.status,
        mainImage: data.mainImage,
        translations: data.translations ? {
          deleteMany: { productId: id },
          create: data.translations,
        } : undefined,
        specifications: data.specifications ? {
          deleteMany: { product_id: id },
          create: data.specifications.map((s: any) => ({
            spec_key: s.specKey.trim(),
            spec_value: s.specValue.trim(),
            updated_at: new Date()
          })),
        } : undefined,
      },
      include: {
        translations: true,
        brand: true,
        specifications: true,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return await prisma.product.delete({ where: { id } });
  }

  async approveProduct(id: string) {
    await this.getById(id);
    return await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.PUBLISHED, isActive: true },
    });
  }

  async rejectProduct(id: string) {
    await this.getById(id);
    return await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, isActive: false },
    });
  }

  async assignSpecifications(id: string, specifications: { specKey: string; specValue: string }[]) {
    await this.getById(id);
    return await prisma.product.update({
      where: { id },
      data: {
        specifications: {
          deleteMany: {},
          create: specifications.map(s => ({
            spec_key: s.specKey.trim(),
            spec_value: s.specValue.trim(),
            updated_at: new Date()
          })),
        },
      },
    });
  }

  async addAttachment(id: string, data: any) {
    await this.getById(id);
    return await prisma.productAttachment.create({
      data: {
        productId: id,
        type: data.type,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        size: data.size,
        language: data.language || 'en',
      },
    });
  }

  async listAttachments(id: string) {
    return await prisma.productAttachment.findMany({
      where: { productId: id },
    });
  }

  async deleteAttachment(productId: string, attachmentId: string) {
    return await prisma.productAttachment.delete({
      where: { id: attachmentId, productId },
    });
  }

  async downloadTemplate() {
    return this.generateTemplate();
  }

  // Legacy/Internal Filter
  async filterProducts(filters: any) {
    const {
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      inStock,
      search,
      sort,
      page = 1,
      limit = 10,
      locale = 'en',
      specs,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      status: ProductStatus.PUBLISHED,
    };

    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (brandId) where.brandId = brandId;

    // Full-text search across name, description (via translations) and SKU
    if (search && search.trim()) {
      where.OR = [
        { sku: { contains: search.trim(), mode: 'insensitive' } },
        {
          translations: {
            some: {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (specs && Object.keys(specs).length > 0) {
      const specConditions = Object.entries(specs).map(([key, values]) => ({
        specifications: {
          some: {
            spec_key: key,
            spec_value: { in: values as string[] },
          },
        },
      }));
      where.AND = specConditions;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = { gte: minPrice, lte: maxPrice };
    }

    if (inStock === true) where.stock = { gt: 0 };
    else if (inStock === false) where.stock = 0;

    // Sort mapping
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          translations: { where: { locale } },
          category: { include: { translations: { where: { locale } } } },
          subcategory: { include: { translations: { where: { locale } } } },
          brand: { include: { brand_translations: { where: { locale } } } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p: any) => ({
        ...p,
        name: p.translations[0]?.name || '',
        description: p.translations[0]?.description || '',
        categoryName: p.category?.translations[0]?.name || '',
      })),
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async generateTemplate() {
    const headers = [
      'Product Name', 'Arabic Name', 'SKU', 'Price', 'Stock', 'Minimum Stock',
      'Category Name', 'Subcategory Name', 'Brand Name', 'Description', 'Arabic Description',
      'Image',
      'spec_Color', 'spec_Material', 'spec_Size'
    ];
    
    const sampleData = [
      {
        'Product Name': 'High Capacity Air Filter',
        'Arabic Name': 'فلتر هواء عالي السعة',
        'SKU': 'AF-HC-001',
        'Price': 299.99,
        'Stock': 100,
        'Minimum Stock': 10,
        'Category Name': 'Industrial Filters',
        'Subcategory Name': 'Air Systems',
        'Brand Name': 'Shielder Core',
        'Description': 'Premium air filter for industrial use',
        'Arabic Description': 'فلتر هواء فائق الجودة للاستخدام الصناعي',
        'Image': 'images/products images/Aluminium grear.jpeg',
        'spec_Color': 'White',
        'spec_Material': 'Synthetic',
        'spec_Size': 'Standard'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async bulkUpload(buffer: Buffer, _mimetype: string) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

    if (data.length === 0) {
      throw new ApiError('The uploaded file is empty', 400);
    }

    // Pre-fetch categories, subcategories, brands to maps
    const [categories, subcategories, allBrands] = await Promise.all([
      prisma.category.findMany({ include: { translations: { where: { locale: 'en' } } } }),
      prisma.subcategory.findMany({ include: { translations: { where: { locale: 'en' } } } }),
      prisma.brands.findMany({ include: { brand_translations: { where: { locale: 'en' } } } }),
    ]);

    const catMap = new Map(categories.map((c: any) => [c.translations[0]?.name.toLowerCase() || '', c.id]));
    const subMap = new Map(subcategories.map((s: any) => [s.translations[0]?.name.toLowerCase() || '', s.id]));
    const brandMap = new Map(allBrands.map((b: any) => [b.name.toLowerCase() || '', b.id]));

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string; sku?: string }[]
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header
      
      try {
        const name = row['Product Name'];
        const sku = row['SKU']?.toString();
        const price = parseFloat(row['Price']);
        const stock = parseInt(row['Stock']);
        const minStock = parseInt(row['Minimum Stock']) || 5;
        const catName = row['Category Name']?.toLowerCase();
        const subName = row['Subcategory Name']?.toLowerCase();
        const brandName = row['Brand Name']?.toLowerCase();
        const description = row['Description'] || '';
        const nameArInput: string = row['Arabic Name']?.toString().trim() || '';
        const descArInput: string = row['Arabic Description']?.toString().trim() || '';

        // Auto-translate if Arabic fields are not provided
        const nameAr = nameArInput || await toArabic(name);
        const descriptionAr = descArInput || (description ? await toArabic(description) : '');
        const rawImage: string | undefined = row['Image']?.toString().trim() || undefined;
        // Normalise image path: bare filename → full relative path
        let mainImage: string | undefined;
        if (rawImage) {
          if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('/')) {
            mainImage = rawImage;
          } else if (rawImage.startsWith('images/')) {
            mainImage = rawImage;
          } else {
            // Treat as a bare filename inside the products images folder
            mainImage = `images/products images/${rawImage}`;
          }
        }

        // Validations
        if (!name || !price || isNaN(price) || isNaN(stock)) {
          throw new Error('Name, Price, and Stock are required and must be numeric');
        }

        const categoryId = catMap.get(catName);
        if (!categoryId) throw new Error(`Category "${row['Category Name']}" not found`);

        const subcategoryId = subMap.get(subName);
        if (!subcategoryId) throw new Error(`Subcategory "${row['Subcategory Name']}" not found`);

        const brandId = brandName ? brandMap.get(brandName) : null;

        // Check SKU uniqueness
        if (sku) {
          const existing = await prisma.product.findFirst({ where: { sku } });
          if (existing) throw new Error(`SKU "${sku}" already exists`);
        }

        // Extract specs (all columns starting with spec_)
        const specifications: { spec_key: string; spec_value: string; updated_at: Date }[] = [];
        Object.entries(row).forEach(([key, val]) => {
          if (key.startsWith('spec_') && val) {
            specifications.push({
              spec_key: key.replace('spec_', ''),
              spec_value: val.toString(),
              updated_at: new Date()
            });
          }
        });

        await prisma.product.create({
          data: {
            sku,
            price,
            stock,
            minimumStockThreshold: minStock,
            categoryId,
            subcategoryId,
            brandId,
            mainImage,
            status: ProductStatus.PUBLISHED, // Auto-approve bulk uploads for now as they come from SuperAdmin
            translations: {
              create: [
                { locale: 'en', name, description },
                { locale: 'ar', name: nameAr, description: descriptionAr || description }
              ]
            },
            specifications: specifications.length > 0 ? {
              create: specifications
            } : undefined
          }
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          sku: row['SKU'],
          error: err.message
        });
      }
    }

    return results;
  }
}

export const productService = new ProductService();
