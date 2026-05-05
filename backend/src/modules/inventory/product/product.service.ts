import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { AttachmentType, Prisma, ProductStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
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

interface FilterOption {
  id: string;
  name: string;
  count: number;
}

type ProductTranslationInput = {
  locale: string;
  name: string;
  description?: string;
};

type ProductSpecificationInput = {
  specKey: string;
  specValue: string;
};

type ProductAttachmentInput = {
  type: AttachmentType;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  size?: number;
  language?: string;
};

type ProductUpsertPayload = {
  sku?: string;
  categoryId: string;
  subcategoryId: string;
  warehouseId?: string;
  brandId?: string;
  supplierId?: string;
  price: number;
  stock: number;
  minimumStockThreshold?: number;
  isActive?: boolean;
  status?: ProductStatus;
  mainImage?: string;
  filterNumber?: string;
  alternateNumbers?: string;
  filterType?: string;
  material?: string;
  dimensions?: string;
  translations: ProductTranslationInput[];
  specifications?: ProductSpecificationInput[];
};

export class ProductService {
  private async getMainWarehouseId(): Promise<string> {
    const flaggedMain = await prisma.warehouse.findFirst({
      where: { isMain: true },
      select: { id: true },
    });

    if (flaggedMain) return flaggedMain.id;

    const existing = await prisma.warehouse.findFirst({
      where: {
        name: {
          equals: 'Main Warehouse',
          mode: 'insensitive',
        },
      },
      select: { id: true, isMain: true },
    });

    if (existing) {
      if (!existing.isMain) {
        await prisma.warehouse.update({ where: { id: existing.id }, data: { isMain: true } });
      }
      return existing.id;
    }

    const created = await prisma.warehouse.create({
      data: {
        name: 'Main Warehouse',
        address: 'Default warehouse (auto-created)',
        city: 'N/A',
        country: 'N/A',
        isMain: true,
        isActive: true,
      },
      select: { id: true },
    });

    return created.id;
  }

  private async ensureMainWarehouseInventory(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
    warehouseId: string,
  ) {
    const normalizedQuantity = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;

    return tx.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      update: {
        quantity: normalizedQuantity,
        reservedQuantity: 0,
      },
      create: {
        productId,
        warehouseId,
        quantity: normalizedQuantity,
        reservedQuantity: 0,
      },
    });
  }

  async create(data: ProductUpsertPayload) {
    const mainWarehouseId = await this.getMainWarehouseId();
    const warehouseId = data.warehouseId || mainWarehouseId;
    const stockQuantity = Number.isFinite(data.stock) ? data.stock : 0;

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          sku: data.sku,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          warehouseId,
          brandId: data.brandId,
          supplierId: data.supplierId,
          price: data.price,
          stock: stockQuantity,
          minimumStockThreshold: data.minimumStockThreshold || 5,
          mainImage: data.mainImage,
          filterNumber: data.filterNumber,
          alternateNumbers: data.alternateNumbers,
          filterType: data.filterType,
          material: data.material,
          dimensions: data.dimensions,
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

      await this.ensureMainWarehouseInventory(tx, createdProduct.id, stockQuantity, mainWarehouseId);
      return createdProduct;
    });

    // Trigger notification for Admin regarding new product approval
    try {
      const NotificationService = (await import('../../notification/notification.service')).default;
      const { NotificationType, UserRole } = await import('@prisma/client');
      
      const productName = data.translations.find((t) => t.locale === 'en')?.name || 'New Product';

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

  async getFiltersMetadata(locale = 'en') {
    const baseWhere: Prisma.ProductWhereInput = {
      isActive: true,
      status: ProductStatus.PUBLISHED,
    };

    const [categoryGroups, brandGroups, priceAggregate, stockCounts] = await Promise.all([
      prisma.product.groupBy({
        by: ['categoryId'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ['brandId'],
        where: { ...baseWhere, brandId: { not: null } },
        _count: { _all: true },
      }),
      prisma.product.aggregate({
        where: baseWhere,
        _min: { price: true },
        _max: { price: true },
      }),
      Promise.all([
        prisma.product.count({ where: { ...baseWhere, stock: { gt: 0 } } }),
        prisma.product.count({ where: { ...baseWhere, stock: 0 } }),
      ]),
    ]);

    const categoryIds = categoryGroups.map(item => item.categoryId);
    const brandIds = brandGroups
      .map(item => item.brandId)
      .filter((id): id is string => typeof id === 'string');

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        where: { id: { in: categoryIds } },
        include: { translations: { where: { locale } } },
      }),
      prisma.brands.findMany({
        where: { id: { in: brandIds } },
        include: { brand_translations: { where: { locale } } },
      }),
    ]);

    const categoryNameMap = new Map(
      categories.map((category) => [
        category.id,
        category.translations?.[0]?.name || 'Category',
      ])
    );

    const brandNameMap = new Map(
      brands.map((brand) => [
        brand.id,
        brand.name || 'Brand',
      ])
    );

    const categoryOptions: FilterOption[] = categoryGroups.map(group => ({
      id: group.categoryId,
      name: categoryNameMap.get(group.categoryId) || 'Category',
      count: group._count._all,
    }));

    const brandOptions: FilterOption[] = brandGroups
      .filter(group => typeof group.brandId === 'string')
      .map(group => ({
        id: group.brandId as string,
        name: brandNameMap.get(group.brandId as string) || 'Brand',
        count: group._count._all,
      }));

    return {
      categories: categoryOptions.sort((a, b) => b.count - a.count),
      brands: brandOptions.sort((a, b) => b.count - a.count),
      priceRange: {
        min: Number(priceAggregate._min.price || 0),
        max: Number(priceAggregate._max.price || 0),
      },
      stock: {
        inStock: stockCounts[0],
        outOfStock: stockCounts[1],
      },
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
        // Put critical inventory items first in management tables:
        // OUT_OF_STOCK (stock=0) -> LOW_STOCK -> remaining items.
        orderBy: [{ stock: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => ({
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

  async update(id: string, data: Partial<ProductUpsertPayload>) {
    await this.getById(id);

    // Build data object dynamically - only include fields that are actually provided
    const updateData: any = {};
    
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.subcategoryId !== undefined) updateData.subcategoryId = data.subcategoryId;
    if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId;
    if (data.brandId !== undefined) updateData.brandId = data.brandId;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.minimumStockThreshold !== undefined) updateData.minimumStockThreshold = data.minimumStockThreshold;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.mainImage !== undefined) updateData.mainImage = data.mainImage;
    if (data.filterNumber !== undefined) updateData.filterNumber = data.filterNumber;
    if (data.alternateNumbers !== undefined) updateData.alternateNumbers = data.alternateNumbers;
    if (data.filterType !== undefined) updateData.filterType = data.filterType;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    
    if (data.translations) {
      updateData.translations = {
        deleteMany: { productId: id },
        create: data.translations,
      };
    }
    
    if (data.specifications) {
      updateData.specifications = {
        deleteMany: { product_id: id },
        create: data.specifications.map((s) => ({
          spec_key: s.specKey.trim(),
          spec_value: s.specValue.trim(),
          updated_at: new Date()
        })),
      };
    }

    return await prisma.product.update({
      where: { id },
      data: updateData,
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

  async bulkDelete(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const deletedIds: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of uniqueIds) {
      try {
        await this.delete(id);
        deletedIds.push(id);
      } catch (error: unknown) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : 'Failed to delete product',
        });
      }
    }

    return {
      requestedCount: uniqueIds.length,
      deletedCount: deletedIds.length,
      deletedIds,
      failed,
    };
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

  async addAttachment(id: string, data: ProductAttachmentInput) {
    await this.getById(id);
    return await prisma.productAttachment.create({
      data: {
        productId: id,
        type: data.type as AttachmentType,
        fileName: data.fileName || '',
        fileUrl: data.fileUrl || '',
        mimeType: data.mimeType || 'application/octet-stream',
        size: data.size ?? 0,
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
  async filterProducts(filters: ProductFilters & { sort?: string; specs?: Record<string, string[]> }) {
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
      products: products.map((p) => ({
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
      'Product Name', 'Arabic Name', 'Filter Number', 'Alternate Numbers',
      'SKU', 'Price', 'Stock', 'Minimum Stock',
      'Category Name', 'Subcategory Name', 'Brand Name',
      'Description', 'Arabic Description',
      'Filter Type', 'Material', 'Dimensions',
      'Image',
      'spec_Color', 'spec_Size'
    ];
    
    const sampleData = [
      {
        'Product Name': 'High Capacity Air Filter',
        'Arabic Name': 'فلتر هواء عالي السعة',
        'Filter Number': 'FN-AF-001',
        'Alternate Numbers': 'AF001, AIR-001, 123456',
        'SKU': 'AF-HC-001',
        'Price': 299.99,
        'Stock': 100,
        'Minimum Stock': 10,
        'Category Name': 'Industrial Filters',
        'Subcategory Name': 'Air Systems',
        'Brand Name': 'Shielder Core',
        'Description': 'Premium air filter for industrial use',
        'Arabic Description': 'فلتر هواء فائق الجودة للاستخدام الصناعي',
        'Filter Type': 'Air Filter',
        'Material': 'Synthetic',
        'Dimensions': '250mm x 150mm x 50mm',
        'Image': 'images/products-images/aluminium-grear.jpeg',
        'spec_Color': 'White',
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
    const data = XLSX.utils.sheet_to_json<Record<string, string | number | undefined>>(workbook.Sheets[sheetName]);
    const asString = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value).trim();
    const normalizeHeader = (value: string): string =>
      value.trim().toLowerCase().replace(/\s*\*+$/g, '').replace(/\s+/g, ' ');
    const getRowValue = (row: Record<string, string | number | undefined>, ...keys: string[]): unknown => {
      const normalizedRow = new Map<string, unknown>(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
      );

      for (const key of keys) {
        const value = normalizedRow.get(normalizeHeader(key));
        if (value !== undefined) {
          return value;
        }
      }

      return undefined;
    };

    if (data.length === 0) {
      throw new ApiError('The uploaded file is empty', 400);
    }

    // ── Extract embedded images from the xlsx (floating images anchored to cells) ──
    // xlsx files are ZIP archives; images live in xl/media/ and anchors in xl/drawings/
    const embeddedImages = new Map<number, string>(); // 0-based Excel row → base64 data URL
    try {
      const zip = new AdmZip(buffer);
      const drawingEntries = zip
        .getEntries()
        .filter((entry) => /^xl\/drawings\/drawing\d+\.xml$/.test(entry.entryName));

      for (const drawingEntry of drawingEntries) {
        const relPath = drawingEntry.entryName.replace('xl/drawings/', 'xl/drawings/_rels/') + '.rels';
        const drawingRelEntry = zip.getEntry(relPath);
        if (!drawingRelEntry) continue;

        const drawingXml = drawingEntry.getData().toString('utf8');
        const relXml = drawingRelEntry.getData().toString('utf8');

        // Build rId → media path map from each drawing rels file
        const relMap = new Map<string, string>();
        // Some generators output Relationship attributes as Id="..." Target="...",
        // others as Target="..." Id="...". Parse per-tag to support both orders.
        const relTagRegex = /<Relationship\b[^>]*>/g;
        let relTagMatch;
        while ((relTagMatch = relTagRegex.exec(relXml)) !== null) {
          const relTag = relTagMatch[0];
          const rIdMatch = relTag.match(/\bId="([^"]+)"/);
          const targetMatch = relTag.match(/\bTarget="([^"]+)"/);
          if (!rIdMatch || !targetMatch) continue;

          const rId = rIdMatch[1];
          const target = targetMatch[1];
          let normalizedTarget = target;
          // Normalize all path formats to xl/media/... format
          if (normalizedTarget.startsWith('../')) {
            normalizedTarget = normalizedTarget.replace(/^\.\.\//, 'xl/');
          } else if (normalizedTarget.startsWith('/xl/')) {
            // Already has /xl/ prefix (absolute ZIP path)
            normalizedTarget = normalizedTarget.substring(1); // Remove leading /
          } else if (normalizedTarget.startsWith('/')) {
            normalizedTarget = normalizedTarget.substring(1); // Remove leading /
          } else if (!normalizedTarget.startsWith('xl/')) {
            normalizedTarget = `xl/drawings/${normalizedTarget}`;
          }
          relMap.set(rId, normalizedTarget);
        }

        // Parse each anchor block: get the FROM row and the blip rId
        // Handle both namespaced (xdr:) and non-namespaced XML formats (different Excel versions/generators)
        const anchorRegex = /<\/?(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g;
        let anchorMatch;
        while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
          const block = anchorMatch[0];
          // Match both <xdr:row> and <row> formats - look for row number in from block
          const rowMatch = block.match(/(?:<xdr:from>|<from>)[\s\S]*?(?:<xdr:row>|<row>)(\d+)(?:<\/xdr:row>|<\/row>)/);
          // Match r:embed with optional xdr: namespace
          const rIdMatch = block.match(/(?:xdr:)?r:embed="([^"]+)"|r:embed="([^"]+)"/);
          if (rowMatch && rIdMatch) {
            const excelRow = parseInt(rowMatch[1]); // 0-based (0 = header row)
            const rId = rIdMatch[1] || rIdMatch[2]; // Get whichever group matched
            const mediaPath = relMap.get(rId);
            if (mediaPath) {
              const imgEntry = zip.getEntry(mediaPath);
              if (imgEntry) {
                const imgBuffer = imgEntry.getData();
                const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                  : ext === 'png' ? 'image/png'
                  : ext === 'gif' ? 'image/gif'
                  : ext === 'webp' ? 'image/webp' : 'image/png';
                embeddedImages.set(excelRow, `data:${mime};base64,${imgBuffer.toString('base64')}`);
              }
            }
          }
        }
      }
    } catch (err) {
      // If ZIP extraction fails, continue — the text Image column will still be used
      console.error('Image extraction failed:', err);
    }

    // Pre-fetch categories, subcategories, brands to maps
    const [categories, subcategories, allBrands] = await Promise.all([
      prisma.category.findMany({ include: { translations: { where: { locale: 'en' } } } }),
      prisma.subcategory.findMany({ include: { translations: { where: { locale: 'en' } } } }),
      prisma.brands.findMany({ include: { brand_translations: { where: { locale: 'en' } } } }),
    ]);

    const catMap = new Map(categories.map((c) => [asString(c.translations[0]?.name).toLowerCase(), c.id]));
    const subMap = new Map(subcategories.map((s) => [asString(s.translations[0]?.name).toLowerCase(), s.id]));
    const brandMap = new Map(allBrands.map((b) => [asString(b.name).toLowerCase(), b.id]));

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      warnings: [] as string[],
      errors: [] as { row: number; error: string; sku?: string }[]
    };
    const defaultWarehouseId = await this.getMainWarehouseId();
    const embeddedImageRows: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header
      
      try {
        const name = asString(getRowValue(row, 'Product Name', 'Name'));
        const sku = asString(getRowValue(row, 'SKU')) || undefined;
        const price = Number(getRowValue(row, 'Price'));
        const stock = Number(getRowValue(row, 'Stock'));
        const minimumStockRaw = Number(getRowValue(row, 'Minimum Stock'));
        const minStock = Number.isFinite(minimumStockRaw) && minimumStockRaw > 0 ? minimumStockRaw : 5;
        const catName = asString(getRowValue(row, 'Category Name', 'Category')).toLowerCase();
        const subName = asString(getRowValue(row, 'Subcategory Name', 'Subcategory')).toLowerCase();
        const brandName = asString(getRowValue(row, 'Brand Name', 'Brand')).toLowerCase();
        const description = asString(getRowValue(row, 'Description'));
        const nameArInput = asString(getRowValue(row, 'Arabic Name'));
        const descArInput = asString(getRowValue(row, 'Arabic Description'));
        const filterNumber: string | undefined = asString(getRowValue(row, 'Filter Number')) || undefined;
        const alternateNumbers: string | undefined = asString(getRowValue(row, 'Alternate Numbers')) || undefined;
        const filterType: string | undefined = asString(getRowValue(row, 'Filter Type')) || undefined;
        const material: string | undefined = asString(getRowValue(row, 'Material')) || undefined;
        const dimensions: string | undefined = asString(getRowValue(row, 'Dimensions')) || undefined;

        // Auto-translate if Arabic fields are not provided
        const nameAr = nameArInput || await toArabic(name);
        const descriptionAr = descArInput || (description ? await toArabic(description) : '');
        const rawImage: string | undefined = asString(getRowValue(row, 'Image')) || undefined;
        // Embedded Excel images are often small previews; prefer Image column path/URL when provided.
        // excelRow is 0-based; row 0 = header, so data row i (0-based) sits at excelRow i+1.
        const embeddedDataUrl = embeddedImages.get(i + 1);

        // Normalise image path: bare filename -> full relative path
        let mainImage: string | undefined;
        if (rawImage) {
          const normalizedRaw = rawImage.replace(/\\/g, '/').replace(/^\.\//, '').trim();
          if (
            normalizedRaw.startsWith('http://') ||
            normalizedRaw.startsWith('https://') ||
            normalizedRaw.startsWith('/') ||
            normalizedRaw.startsWith('images/')
          ) {
            mainImage = normalizedRaw;
          } else {
            // Preserve original filename casing/spaces; frontend encodes URL segments safely.
            const justFile = normalizedRaw.split('/').pop()!;
            mainImage = `images/products-images/${justFile}`;
          }
        }

        // Fallback to embedded image only if no Image column value is provided.
        if (!mainImage) {
          mainImage = embeddedDataUrl;
          if (embeddedDataUrl) {
            embeddedImageRows.push(rowNum);
          }
        }

        // Validations
        if (!name || isNaN(price) || isNaN(stock)) {
          throw new Error('Name is required, and Price/Stock must be valid numbers');
        }

        // Auto-create category if it doesn't exist
        let categoryId = catMap.get(catName);
        if (!categoryId) {
          const displayName = asString(getRowValue(row, 'Category Name')) || catName;
          const newCat = await prisma.category.create({
            data: {
              translations: {
                create: [
                  { locale: 'en', name: displayName },
                  { locale: 'ar', name: await toArabic(displayName) },
                ]
              }
            }
          });
          categoryId = newCat.id;
          catMap.set(catName, categoryId);
        }

        // Auto-create subcategory if it doesn't exist (linked to the category above)
        let subcategoryId = subMap.get(subName);
        if (!subcategoryId) {
          const displayName = asString(getRowValue(row, 'Subcategory Name')) || subName;
          const newSub = await prisma.subcategory.create({
            data: {
              categoryId,
              translations: {
                create: [
                  { locale: 'en', name: displayName },
                  { locale: 'ar', name: await toArabic(displayName) },
                ]
              }
            }
          });
          subcategoryId = newSub.id;
          subMap.set(subName, subcategoryId);
        }

        const brandId = brandName ? (brandMap.get(brandName) || undefined) : undefined;

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

        await prisma.$transaction(async (tx) => {
          const createdProduct = await tx.product.create({
            data: {
              sku,
              price,
              stock,
              minimumStockThreshold: minStock,
              categoryId,
              subcategoryId,
              warehouseId: defaultWarehouseId,
              brandId,
              mainImage,
              filterNumber,
              alternateNumbers,
              filterType,
              material,
              dimensions,
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

          await this.ensureMainWarehouseInventory(tx, createdProduct.id, stock, defaultWarehouseId);
        });

        results.success++;
      } catch (err: unknown) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          sku: asString(getRowValue(row, 'SKU')) || undefined,
          error: err instanceof Error ? err.message : 'Unknown upload error'
        });
      }
    }

    if (embeddedImageRows.length > 0) {
      results.warnings.push(
        `${embeddedImageRows.length} row(s) used embedded Excel images. Those images are stored exactly as provided in the workbook and may be low-resolution. For best quality, provide a high-resolution file path or URL in the Image column.`
      );
    }

    return results;
  }
}

export const productService = new ProductService();
