/**
 * Seed Test Data — Shielder Platform
 *
 * Inserts: 10 Categories, 50 Subcategories, 100 Products, 5 Customers, 2 Admins, 1 Super Admin
 *
 * Run:  npx tsx src/scripts/seed-test-data.ts
 * Safe: skips records that already exist (idempotent)
 *
 * NOTE: Product schema does not have an `isFeatured` column.
 *       The "20% featured" products are distinguished by status=PUBLISHED
 *       and a higher stock level. If you need a dedicated column, add it
 *       via a Prisma migration first.
 */

import { PrismaClient, UserRole, UserStatus, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Image pool (cycle through available images) ─────────────────────────────
const CATEGORY_IMAGES = [
  'images/UserEnd images/filter category demoy images.jpg',
  'images/UserEnd images/filter category deomy image.jpg',
  'images/UserEnd images/filter catogory deomy image 2.jpg',
  'images/UserEnd images/filter category deomy image 3.jpg',
  'images/UserEnd images/StockCake-Robotic_Assembly_Line-503452-medium 1.png',
];

const PRODUCT_IMAGES = [
  'images/products-images/Aluminium grear.jpeg',
  'images/products-images/Exaavator spare parts.jpeg',
  'images/products-images/Exaavator.jpeg',
  'images/products-images/Haky parts.jpeg',
  'images/products-images/UMGS PARTS.jpeg',
  'images/products-images/filter category demoy images.jpg',
  'images/products-images/filter category deomy image 3.jpg',
  'images/products-images/filter category deomy image.jpg',
  'images/products-images/filter catogory deomy image 2.jpg',
  'images/products-images/saprepartss.jpeg',
  'images/products-images/spare parts.jpeg',
];

const USER_IMAGES = [
  'images/UserEnd images/user-1 imge.jpg',
  'images/UserEnd images/user-2image.jpg',
  'images/UserEnd images/user3 image.jpg',
  'images/UserEnd images/user imag 4.jpg',
  'images/UserEnd images/user imag 4 2.jpg',
];

// Helper: pick image from pool cyclically
const img = (pool: string[], index: number) => pool[index % pool.length];

// Helper: random int between min and max (inclusive)
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: random price between min and max (2 decimal places)
const randPrice = (min: number, max: number) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

// ─── Seed date ────────────────────────────────────────────────────────────────
const SEED_DATE = new Date('2026-03-02T08:00:00.000Z');

// ════════════════════════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════════

interface CategoryDef {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  subcategories: SubcategoryDef[];
}

interface SubcategoryDef {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  products: ProductDef[];
}

interface ProductDef {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  sku: string;
  priceMin: number;
  priceMax: number;
}

const CATEGORIES: CategoryDef[] = [
  // ── 1. Air Filters ──────────────────────────────────────────────────────────
  {
    nameEn: 'Air Filters',
    nameAr: 'فلاتر الهواء',
    descriptionEn: 'High-performance air filtration systems for industrial and commercial environments.',
    descriptionAr: 'أنظمة تصفية هواء عالية الأداء للبيئات الصناعية والتجارية.',
    subcategories: [
      {
        nameEn: 'Panel Air Filters',
        nameAr: 'فلاتر هواء لوحية',
        descriptionEn: 'Flat panel filters for ventilation and HVAC systems.',
        descriptionAr: 'فلاتر لوحية مسطحة لأنظمة التهوية والتكييف.',
        products: [
          { nameEn: 'Panel Air Filter PAF-100', nameAr: 'فلتر هواء لوحي PAF-100', descriptionEn: 'Standard panel air filter for industrial ventilation systems, G4 grade.', descriptionAr: 'فلتر هواء لوحي قياسي لأنظمة التهوية الصناعية، درجة G4.', sku: 'PAF-100', priceMin: 50, priceMax: 150 },
          { nameEn: 'Heavy-Duty Panel Filter PAF-200', nameAr: 'فلتر لوحي للأعمال الشاقة PAF-200', descriptionEn: 'Heavy-duty panel filter with extended service life, F7 grade efficiency.', descriptionAr: 'فلتر لوحي للأعمال الشاقة بعمر خدمة ممتد، كفاءة درجة F7.', sku: 'PAF-200', priceMin: 120, priceMax: 280 },
        ],
      },
      {
        nameEn: 'Cylindrical Air Filters',
        nameAr: 'فلاتر هواء أسطوانية',
        descriptionEn: 'Cylindrical cartridge air filters for compressors and engines.',
        descriptionAr: 'فلاتر هواء أسطوانية الخرطوشة للضواغط والمحركات.',
        products: [
          { nameEn: 'Cylindrical Air Filter CAF-305', nameAr: 'فلتر هواء أسطواني CAF-305', descriptionEn: 'Precision cylindrical air filter for air compressors, 305mm height.', descriptionAr: 'فلتر هواء أسطواني دقيق لضواغط الهواء، ارتفاع 305 ملم.', sku: 'CAF-305', priceMin: 80, priceMax: 200 },
          { nameEn: 'Industrial Cartridge Filter ICF-420', nameAr: 'فلتر خرطوشة صناعي ICF-420', descriptionEn: 'Industrial-grade cartridge filter with nano-fiber media for fine particle capture.', descriptionAr: 'فلتر خرطوشة بمستوى صناعي بوسيط من الألياف النانوية لالتقاط الجسيمات الدقيقة.', sku: 'ICF-420', priceMin: 150, priceMax: 350 },
        ],
      },
      {
        nameEn: 'Cabin Air Filters',
        nameAr: 'فلاتر هواء المقصورة',
        descriptionEn: 'Cabin and operator enclosure air filters for machinery.',
        descriptionAr: 'فلاتر هواء للمقصورة ومحيط المشغّل في الآلات.',
        products: [
          { nameEn: 'Premium Cabin Filter PCF-01', nameAr: 'فلتر مقصورة ممتاز PCF-01', descriptionEn: 'Premium cabin air filter with activated carbon layer for odor removal.', descriptionAr: 'فلتر هواء مقصورة ممتاز بطبقة كربون مفعّل لإزالة الروائح.', sku: 'PCF-01', priceMin: 60, priceMax: 180 },
          { nameEn: 'HEPA Cabin Filter HCF-02', nameAr: 'فلتر مقصورة HEPA HCF-02', descriptionEn: 'HEPA-rated cabin filter for heavy machinery operator cabs.', descriptionAr: 'فلتر مقصورة بمعيار HEPA لكبائن مشغّلي الآلات الثقيلة.', sku: 'HCF-02', priceMin: 200, priceMax: 450 },
        ],
      },
      {
        nameEn: 'Compressed Air Filters',
        nameAr: 'فلاتر الهواء المضغوط',
        descriptionEn: 'Inline filters for compressed air lines, removing oil and moisture.',
        descriptionAr: 'فلاتر مدمجة لخطوط الهواء المضغوط لإزالة الزيت والرطوبة.',
        products: [
          { nameEn: 'Compressed Air Filter AF-C10', nameAr: 'فلتر هواء مضغوط AF-C10', descriptionEn: 'High-efficiency compressed air filter, 0.01 micron rating, 10 bar max pressure.', descriptionAr: 'فلتر هواء مضغوط عالي الكفاءة، تصنيف 0.01 ميكرون، ضغط أقصى 10 بار.', sku: 'AF-C10', priceMin: 180, priceMax: 420 },
          { nameEn: 'Oil Mist Separator OMS-15', nameAr: 'فاصل رذاذ زيت OMS-15', descriptionEn: 'Coalescing filter separator for oil mist in compressed air systems.', descriptionAr: 'فلتر فاصل تجمّع لرذاذ الزيت في أنظمة الهواء المضغوط.', sku: 'OMS-15', priceMin: 250, priceMax: 600 },
        ],
      },
      {
        nameEn: 'High-Efficiency Air Filters',
        nameAr: 'فلاتر الهواء عالية الكفاءة',
        descriptionEn: 'Ultra-high-efficiency filters for cleanrooms and critical environments.',
        descriptionAr: 'فلاتر فائقة الكفاءة للغرف النظيفة والبيئات الحرجة.',
        products: [
          { nameEn: 'HEPA Filter H14 Grade HF-H14', nameAr: 'فلتر HEPA درجة H14 HF-H14', descriptionEn: 'Class H14 HEPA filter capturing 99.995% of particles ≥0.3 microns.', descriptionAr: 'فلتر HEPA فئة H14 يلتقط 99.995% من الجسيمات ≥0.3 ميكرون.', sku: 'HF-H14', priceMin: 400, priceMax: 900 },
          { nameEn: 'ULPA Filter UF-U15', nameAr: 'فلتر ULPA UF-U15', descriptionEn: 'Ultra-Low Penetration Air filter for semiconductor and pharmaceutical cleanrooms.', descriptionAr: 'فلتر هواء بتغلغل منخفض للغاية للغرف النظيفة في صناعات الرقائق والأدوية.', sku: 'UF-U15', priceMin: 700, priceMax: 1500 },
        ],
      },
    ],
  },

  // ── 2. Oil Filters ───────────────────────────────────────────────────────────
  {
    nameEn: 'Oil Filters',
    nameAr: 'فلاتر الزيت',
    descriptionEn: 'Industrial and automotive oil filtration systems for engine and machinery protection.',
    descriptionAr: 'أنظمة ترشيح زيت صناعية وسيارات لحماية المحركات والآلات.',
    subcategories: [
      {
        nameEn: 'Engine Oil Filters',
        nameAr: 'فلاتر زيت المحرك',
        descriptionEn: 'Full-flow and bypass oil filters for heavy diesel and gas engines.',
        descriptionAr: 'فلاتر زيت تدفق كامل وتجاوزي للمحركات الثقيلة ديزل والغاز.',
        products: [
          { nameEn: 'Heavy-Duty Engine Oil Filter EOF-HD1', nameAr: 'فلتر زيت محرك للأعمال الشاقة EOF-HD1', descriptionEn: 'Heavy-duty spin-on oil filter designed for diesel engines up to 600HP.', descriptionAr: 'فلتر زيت دوراني للأعمال الشاقة مصمم لمحركات الديزل حتى 600 حصان.', sku: 'EOF-HD1', priceMin: 70, priceMax: 200 },
          { nameEn: 'Bypass Oil Filter BOF-02', nameAr: 'فلتر زيت تجاوزي BOF-02', descriptionEn: 'High-capacity bypass oil filter for extended oil drain intervals.', descriptionAr: 'فلتر زيت تجاوزي عالي السعة لفترات تصريف زيت ممتدة.', sku: 'BOF-02', priceMin: 130, priceMax: 320 },
        ],
      },
      {
        nameEn: 'Gear Oil Filters',
        nameAr: 'فلاتر زيت التروس',
        descriptionEn: 'Filtration solutions for gearboxes and transmission systems.',
        descriptionAr: 'حلول ترشيح لعلب التروس وأنظمة نقل الحركة.',
        products: [
          { nameEn: 'Gearbox Filter GBF-10', nameAr: 'فلتر علبة تروس GBF-10', descriptionEn: 'High-flow gearbox oil filter with magnetic particle capture ring.', descriptionAr: 'فلتر زيت علبة تروس عالي التدفق مع حلقة التقاط جسيمات مغناطيسية.', sku: 'GBF-10', priceMin: 90, priceMax: 250 },
          { nameEn: 'Industrial Gear Filter IGF-20', nameAr: 'فلتر تروس صناعي IGF-20', descriptionEn: 'Industrial gear oil filter rated for viscosity grades ISO VG 68-320.', descriptionAr: 'فلتر زيت تروس صناعي مصنّف لدرجات اللزوجة ISO VG 68-320.', sku: 'IGF-20', priceMin: 200, priceMax: 500 },
        ],
      },
      {
        nameEn: 'Transmission Oil Filters',
        nameAr: 'فلاتر زيت ناقل الحركة',
        descriptionEn: 'Automatic and manual transmission oil filters.',
        descriptionAr: 'فلاتر زيت لناقل الحركة الأوتوماتيكي واليدوي.',
        products: [
          { nameEn: 'Auto Transmission Filter ATF-01', nameAr: 'فلتر ناقل حركة أوتوماتيكي ATF-01', descriptionEn: 'OEM-spec automatic transmission fluid filter with gasket kit.', descriptionAr: 'فلتر سائل ناقل الحركة الأوتوماتيكي بمواصفات OEM مع طقم حشية.', sku: 'ATF-01', priceMin: 60, priceMax: 160 },
          { nameEn: 'Heavy Transmission Filter HTF-30', nameAr: 'فلتر ناقل حركة ثقيل HTF-30', descriptionEn: 'Heavy equipment transmission filter with 25-micron filtration rating.', descriptionAr: 'فلتر ناقل حركة للمعدات الثقيلة بتصنيف ترشيح 25 ميكرون.', sku: 'HTF-30', priceMin: 150, priceMax: 380 },
        ],
      },
      {
        nameEn: 'Centrifugal Oil Filters',
        nameAr: 'فلاتر الزيت الطاردة المركزية',
        descriptionEn: 'Centrifugal oil cleaners for continuous high-volume filtration.',
        descriptionAr: 'منظفات زيت طاردة مركزية للترشيح المستمر عالي الحجم.',
        products: [
          { nameEn: 'Centrifugal Oil Cleaner COC-500', nameAr: 'منظف زيت طارد مركزي COC-500', descriptionEn: 'Self-powered centrifugal oil cleaner removing particles down to 1 micron.', descriptionAr: 'منظف زيت طارد مركزي ذاتي الطاقة يزيل الجسيمات حتى 1 ميكرون.', sku: 'COC-500', priceMin: 350, priceMax: 800 },
          { nameEn: 'Industrial Centrifuge ICE-800', nameAr: 'طرد مركزي صناعي ICE-800', descriptionEn: 'Industrial centrifuge oil filter for large diesel generators and compressors.', descriptionAr: 'فلتر زيت طرد مركزي صناعي لمولدات الديزل الكبيرة والضواغط.', sku: 'ICE-800', priceMin: 600, priceMax: 1400 },
        ],
      },
      {
        nameEn: 'Magnetic Oil Filters',
        nameAr: 'فلاتر الزيت المغناطيسية',
        descriptionEn: 'Magnetic plug and in-line filters for metallic particle capture.',
        descriptionAr: 'فلاتر مغناطيسية قابس وخطية التقاط الجسيمات المعدنية.',
        products: [
          { nameEn: 'Magnetic Drain Plug MDP-M12', nameAr: 'سدادة صرف مغناطيسية MDP-M12', descriptionEn: 'M12x1.5 magnetic drain plug capturing ferrous contaminants from oil sumps.', descriptionAr: 'سدادة صرف مغناطيسية M12x1.5 لالتقاط الملوثات الحديدية من أحواض الزيت.', sku: 'MDP-M12', priceMin: 50, priceMax: 120 },
          { nameEn: 'Inline Magnetic Filter IMF-34', nameAr: 'فلتر مغناطيسي خطي IMF-34', descriptionEn: 'Inline magnetic oil filter with 45 L/min flow rate and 34mm port size.', descriptionAr: 'فلتر زيت مغناطيسي خطي بمعدل تدفق 45 لتر/دقيقة وحجم منفذ 34 ملم.', sku: 'IMF-34', priceMin: 110, priceMax: 280 },
        ],
      },
    ],
  },

  // ── 3. Water Filters ─────────────────────────────────────────────────────────
  {
    nameEn: 'Water Filters',
    nameAr: 'فلاتر المياه',
    descriptionEn: 'Industrial water treatment and purification filtration systems.',
    descriptionAr: 'أنظمة ترشيح معالجة وتنقية المياه الصناعية.',
    subcategories: [
      {
        nameEn: 'Sediment Filters',
        nameAr: 'فلاتر الترسيب',
        descriptionEn: 'Removes suspended solids, sand, and sediment from water.',
        descriptionAr: 'تزيل المواد الصلبة العالقة والرمل والترسبات من الماء.',
        products: [
          { nameEn: 'Sediment Filter Cartridge SFC-5', nameAr: 'خرطوشة فلتر ترسيب SFC-5', descriptionEn: 'Polypropylene sediment filter cartridge, 5-micron rating, 10" standard size.', descriptionAr: 'خرطوشة فلتر ترسيب بولي بروبيلين، تصنيف 5 ميكرون، مقاس قياسي 10 بوصة.', sku: 'SFC-5', priceMin: 50, priceMax: 130 },
          { nameEn: 'Bag Filter BF-100', nameAr: 'فلتر كيس BF-100', descriptionEn: 'Industrial bag filter housing for high-flow sediment removal, 100 LPM.', descriptionAr: 'سكن فلتر كيس صناعي لإزالة الترسبات عالية التدفق، 100 لتر/دقيقة.', sku: 'BF-100', priceMin: 180, priceMax: 450 },
        ],
      },
      {
        nameEn: 'Carbon Block Filters',
        nameAr: 'فلاتر الكتلة الكربونية',
        descriptionEn: 'Activated carbon block filters for chlorine and VOC removal.',
        descriptionAr: 'فلاتر كتلة كربون مفعّل لإزالة الكلور والمركبات العضوية المتطايرة.',
        products: [
          { nameEn: 'Carbon Block Filter CBF-10', nameAr: 'فلتر كتلة كربونية CBF-10', descriptionEn: 'Activated carbon block filter, 0.5-micron rating, reduces chlorine and taste.', descriptionAr: 'فلتر كتلة كربون مفعّل، تصنيف 0.5 ميكرون، يقلل الكلور والطعم.', sku: 'CBF-10', priceMin: 70, priceMax: 180 },
          { nameEn: 'Granular Activated Carbon GAC-20', nameAr: 'كربون مفعّل حبيبي GAC-20', descriptionEn: 'Granular activated carbon filter for industrial water treatment applications.', descriptionAr: 'فلتر كربون مفعّل حبيبي لتطبيقات معالجة المياه الصناعية.', sku: 'GAC-20', priceMin: 120, priceMax: 300 },
        ],
      },
      {
        nameEn: 'Reverse Osmosis Systems',
        nameAr: 'أنظمة التناضح العكسي',
        descriptionEn: 'High-pressure RO membranes for desalination and purification.',
        descriptionAr: 'أغشية تناضح عكسي عالية الضغط لإزالة الملوحة والتنقية.',
        products: [
          { nameEn: 'RO Membrane 4040 ROM-4040', nameAr: 'غشاء تناضح عكسي 4040 ROM-4040', descriptionEn: 'Industrial RO membrane element, 4"x40" size, 2400 GPD permeate flow.', descriptionAr: 'عنصر غشاء تناضح عكسي صناعي، مقاس 4"×40"، تدفق نفاذية 2400 غالون/يوم.', sku: 'ROM-4040', priceMin: 250, priceMax: 600 },
          { nameEn: 'Commercial RO System CRS-500', nameAr: 'نظام تناضح عكسي تجاري CRS-500', descriptionEn: 'Complete commercial reverse osmosis system, 500 GPD capacity, 5-stage filtration.', descriptionAr: 'نظام تناضح عكسي تجاري كامل، سعة 500 غالون/يوم، ترشيح 5 مراحل.', sku: 'CRS-500', priceMin: 800, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'UV Water Purifiers',
        nameAr: 'أجهزة تنقية المياه بالأشعة فوق البنفسجية',
        descriptionEn: 'Ultraviolet water sterilizers for bacteria and virus elimination.',
        descriptionAr: 'معقمات مياه بالأشعة فوق البنفسجية للقضاء على البكتيريا والفيروسات.',
        products: [
          { nameEn: 'UV Sterilizer 12 GPM UVS-12', nameAr: 'معقم بالأشعة فوق البنفسجية 12 GPM UVS-12', descriptionEn: 'UV water sterilizer, 12 GPM flow rate, 55W lamp, 254nm wavelength.', descriptionAr: 'معقم مياه بالأشعة فوق البنفسجية، معدل تدفق 12 غالون/دقيقة، مصباح 55 واط، طول موجة 254 نانومتر.', sku: 'UVS-12', priceMin: 300, priceMax: 700 },
          { nameEn: 'Industrial UV System IUV-60', nameAr: 'نظام أشعة فوق بنفسجية صناعي IUV-60', descriptionEn: 'Industrial UV water treatment system, 60 GPM, stainless steel chamber, log-4 reduction.', descriptionAr: 'نظام معالجة مياه بالأشعة فوق البنفسجية الصناعية، 60 غالون/دقيقة، غرفة فولاذ مقاوم للصدأ.', sku: 'IUV-60', priceMin: 900, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Inline Water Filters',
        nameAr: 'فلاتر المياه الخطية',
        descriptionEn: 'Inline point-of-use water filters for pipes and equipment.',
        descriptionAr: 'فلاتر مياه خطية عند نقطة الاستخدام للأنابيب والمعدات.',
        products: [
          { nameEn: 'Inline Y-Strainer IYS-34', nameAr: 'مصفاة Y خطية IYS-34', descriptionEn: '3/4" inline Y-strainer, stainless steel mesh, PN40 pressure rating.', descriptionAr: 'مصفاة Y خطية 3/4 بوصة، شبكة فولاذ مقاوم للصدأ، تصنيف ضغط PN40.', sku: 'IYS-34', priceMin: 80, priceMax: 220 },
          { nameEn: 'Multi-Stage Inline Filter MIF-3S', nameAr: 'فلتر خطي متعدد المراحل MIF-3S', descriptionEn: '3-stage inline water filter with sediment, carbon, and post-carbon stages.', descriptionAr: 'فلتر مياه خطي ثلاثي المراحل مع مراحل ترسيب وكربون وكربون ما بعد.', sku: 'MIF-3S', priceMin: 150, priceMax: 380 },
        ],
      },
    ],
  },

  // ── 4. Hydraulic Filters ─────────────────────────────────────────────────────
  {
    nameEn: 'Hydraulic Filters',
    nameAr: 'فلاتر الهيدروليك',
    descriptionEn: 'Precision hydraulic fluid filtration for industrial machinery and mobile equipment.',
    descriptionAr: 'ترشيح دقيق لسائل الهيدروليك للآلات الصناعية والمعدات المتنقلة.',
    subcategories: [
      {
        nameEn: 'Return Line Filters',
        nameAr: 'فلاتر خط العودة',
        descriptionEn: 'Low-pressure return line hydraulic filters for tank-top installation.',
        descriptionAr: 'فلاتر هيدروليك منخفضة الضغط لخط العودة للتركيب على قمة الخزان.',
        products: [
          { nameEn: 'Return Line Filter RLF-25', nameAr: 'فلتر خط عودة RLF-25', descriptionEn: 'Tank-top return line filter, 25-micron rating, 80 L/min flow, with bypass valve.', descriptionAr: 'فلتر خط عودة على قمة الخزان، تصنيف 25 ميكرون، تدفق 80 لتر/دقيقة، مع صمام تجاوز.', sku: 'RLF-25', priceMin: 120, priceMax: 320 },
          { nameEn: 'High-Flow Return Filter HRF-150', nameAr: 'فلتر عودة عالي التدفق HRF-150', descriptionEn: 'High-flow return line hydraulic filter, 150 L/min, dual-element configuration.', descriptionAr: 'فلتر هيدروليك خط عودة عالي التدفق، 150 لتر/دقيقة، تكوين عنصر مزدوج.', sku: 'HRF-150', priceMin: 280, priceMax: 650 },
        ],
      },
      {
        nameEn: 'Suction Strainers',
        nameAr: 'مصافي السحب',
        descriptionEn: 'Pump suction strainers to protect hydraulic pumps from contamination.',
        descriptionAr: 'مصافي سحب المضخة لحماية مضخات الهيدروليك من التلوث.',
        products: [
          { nameEn: 'Hydraulic Suction Strainer HSS-60', nameAr: 'مصفاة سحب هيدروليكية HSS-60', descriptionEn: 'Stainless steel suction strainer, 60-mesh, for pumps up to 120 L/min.', descriptionAr: 'مصفاة سحب فولاذ مقاوم للصدأ، 60 شبكة، للمضخات حتى 120 لتر/دقيقة.', sku: 'HSS-60', priceMin: 60, priceMax: 180 },
          { nameEn: 'Magnetic Suction Strainer MSS-100', nameAr: 'مصفاة سحب مغناطيسية MSS-100', descriptionEn: 'Magnetic suction filter with stainless wire mesh, 100-micron rating.', descriptionAr: 'فلتر سحب مغناطيسي بشبكة سلك فولاذية، تصنيف 100 ميكرون.', sku: 'MSS-100', priceMin: 100, priceMax: 260 },
        ],
      },
      {
        nameEn: 'High-Pressure Line Filters',
        nameAr: 'فلاتر خط الضغط العالي',
        descriptionEn: 'Pressure filters rated to 420 bar for high-pressure hydraulic circuits.',
        descriptionAr: 'فلاتر ضغط مصنفة حتى 420 بار لدوائر الهيدروليك عالية الضغط.',
        products: [
          { nameEn: 'HP Line Filter HLF-210', nameAr: 'فلتر خط HP HLF-210', descriptionEn: 'High-pressure hydraulic line filter, 210 bar, 10-micron absolute rating.', descriptionAr: 'فلتر خط هيدروليك عالي الضغط، 210 بار، تصنيف مطلق 10 ميكرون.', sku: 'HLF-210', priceMin: 350, priceMax: 800 },
          { nameEn: 'Ultra-HP Filter UHF-420', nameAr: 'فلتر فائق الضغط UHF-420', descriptionEn: 'Ultra-high-pressure hydraulic filter, 420 bar, 3-micron absolute, with clogging indicator.', descriptionAr: 'فلتر هيدروليك فائق الضغط، 420 بار، مطلق 3 ميكرون، مع مؤشر انسداد.', sku: 'UHF-420', priceMin: 700, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Off-Line Filtration',
        nameAr: 'الترشيح خارج الخط',
        descriptionEn: 'Kidney loop filtration systems for continuous fluid conditioning.',
        descriptionAr: 'أنظمة ترشيح حلقة كلوية لتكييف السائل المستمر.',
        products: [
          { nameEn: 'Kidney Loop Filter KLF-40', nameAr: 'فلتر حلقة كلوية KLF-40', descriptionEn: 'Off-line kidney loop filter unit, 40 L/min pump, 3-micron filtration.', descriptionAr: 'وحدة فلتر حلقة كلوية خارج الخط، مضخة 40 لتر/دقيقة، ترشيح 3 ميكرون.', sku: 'KLF-40', priceMin: 400, priceMax: 950 },
          { nameEn: 'Portable Filtration Unit PFU-20', nameAr: 'وحدة ترشيح محمولة PFU-20', descriptionEn: 'Portable hydraulic fluid filtration unit on wheels, 20 L/min, 1-micron final stage.', descriptionAr: 'وحدة ترشيح سائل هيدروليك محمولة على عجلات، 20 لتر/دقيقة، مرحلة نهائية 1 ميكرون.', sku: 'PFU-20', priceMin: 600, priceMax: 1300 },
        ],
      },
      {
        nameEn: 'Air Breather Filters',
        nameAr: 'فلاتر تنفّس الهواء',
        descriptionEn: 'Hydraulic tank breather filters preventing airborne contamination.',
        descriptionAr: 'فلاتر تنفّس خزان هيدروليكي تمنع التلوث المحمول جواً.',
        products: [
          { nameEn: 'Desiccant Breather DBF-02', nameAr: 'مجفف تنفيسي DBF-02', descriptionEn: 'Silica gel desiccant breather with 3-micron particulate filter for hydraulic tanks.', descriptionAr: 'مجفف تنفيسي جل سيليكا مع فلتر جسيمات 3 ميكرون لخزانات الهيدروليك.', sku: 'DBF-02', priceMin: 80, priceMax: 200 },
          { nameEn: 'Tank Breather Cap TBC-16', nameAr: 'غطاء تنفّس الخزان TBC-16', descriptionEn: 'Industrial tank breather with spin-on replaceable filter, BSP 1" connection.', descriptionAr: 'تنفيسة خزان صناعية مع فلتر قابل للاستبدال بالتدوير، توصيل BSP 1 بوصة.', sku: 'TBC-16', priceMin: 55, priceMax: 150 },
        ],
      },
    ],
  },

  // ── 5. Fuel Filters ──────────────────────────────────────────────────────────
  {
    nameEn: 'Fuel Filters',
    nameAr: 'فلاتر الوقود',
    descriptionEn: 'Fuel filtration and water separation for diesel, petrol, and marine engines.',
    descriptionAr: 'ترشيح الوقود وفصل الماء لمحركات الديزل والبنزين والبحرية.',
    subcategories: [
      {
        nameEn: 'Diesel Fuel Filters',
        nameAr: 'فلاتر وقود الديزل',
        descriptionEn: 'Primary and secondary diesel fuel filters for industrial generators.',
        descriptionAr: 'فلاتر وقود الديزل الأولية والثانوية لمولدات الطاقة الصناعية.',
        products: [
          { nameEn: 'Primary Diesel Filter PDF-10', nameAr: 'فلتر ديزل أولي PDF-10', descriptionEn: 'Primary diesel fuel filter with water separator bowl, 10-micron rating.', descriptionAr: 'فلتر وقود ديزل أولي مع وعاء فاصل مياه، تصنيف 10 ميكرون.', sku: 'PDF-10', priceMin: 80, priceMax: 220 },
          { nameEn: 'Secondary Diesel Filter SDF-02', nameAr: 'فلتر ديزل ثانوي SDF-02', descriptionEn: 'Secondary (final stage) diesel filter, 2-micron absolute, protects injection pumps.', descriptionAr: 'فلتر ديزل ثانوي (المرحلة النهائية)، مطلق 2 ميكرون، يحمي مضخات الحقن.', sku: 'SDF-02', priceMin: 120, priceMax: 300 },
        ],
      },
      {
        nameEn: 'Petrol Fuel Filters',
        nameAr: 'فلاتر وقود البنزين',
        descriptionEn: 'Inline and canister petrol fuel filters for gasoline engines.',
        descriptionAr: 'فلاتر وقود بنزين خطية وعلبية لمحركات البنزين.',
        products: [
          { nameEn: 'Inline Petrol Filter IPF-01', nameAr: 'فلتر بنزين خطي IPF-01', descriptionEn: 'Universal inline petrol fuel filter, 6mm barb fitting, for carbureted engines.', descriptionAr: 'فلتر وقود بنزين خطي عالمي، توصيل شوكة 6 ملم، للمحركات ذات المغذّي.', sku: 'IPF-01', priceMin: 50, priceMax: 130 },
          { nameEn: 'EFI Fuel Filter EFF-03', nameAr: 'فلتر وقود EFI EFF-03', descriptionEn: 'High-pressure fuel filter for electronic fuel injection systems, 5-micron.', descriptionAr: 'فلتر وقود عالي الضغط لأنظمة الحقن الإلكتروني للوقود، 5 ميكرون.', sku: 'EFF-03', priceMin: 90, priceMax: 230 },
        ],
      },
      {
        nameEn: 'Marine Fuel Filters',
        nameAr: 'فلاتر الوقود البحرية',
        descriptionEn: 'Marine-grade fuel water separators and filters for boat engines.',
        descriptionAr: 'فواصل مياه وقود بمستوى بحري وفلاتر لمحركات القوارب.',
        products: [
          { nameEn: 'Marine Fuel Water Separator MFS-18', nameAr: 'فاصل ماء وقود بحري MFS-18', descriptionEn: 'Racor-style marine fuel water separator, 18mm inlet, 10-micron element.', descriptionAr: 'فاصل مياه وقود بحري بأسلوب Racor، مدخل 18 ملم، عنصر 10 ميكرون.', sku: 'MFS-18', priceMin: 140, priceMax: 380 },
          { nameEn: 'Twin-Turbine Marine Filter TTM-30', nameAr: 'فلتر بحري توربين مزدوج TTM-30', descriptionEn: 'High-capacity twin-turbine marine fuel filter for large commercial vessels.', descriptionAr: 'فلتر وقود بحري عالي السعة توربين مزدوج للسفن التجارية الكبيرة.', sku: 'TTM-30', priceMin: 300, priceMax: 700 },
        ],
      },
      {
        nameEn: 'Fuel Polishing Systems',
        nameAr: 'أنظمة صقل الوقود',
        descriptionEn: 'Fuel polishing systems for stored diesel tanks to remove biological contamination.',
        descriptionAr: 'أنظمة صقل الوقود لخزانات الديزل المخزنة لإزالة التلوث البيولوجي.',
        products: [
          { nameEn: 'Fuel Polishing Unit FPU-100', nameAr: 'وحدة صقل وقود FPU-100', descriptionEn: 'Diesel fuel polishing system, 100 L/hr throughput, removes water and biological growth.', descriptionAr: 'نظام صقل وقود الديزل، إنتاجية 100 لتر/ساعة، يزيل الماء والنمو البيولوجي.', sku: 'FPU-100', priceMin: 500, priceMax: 1200 },
          { nameEn: 'Mobile Fuel Polisher MFP-50', nameAr: 'جهاز صقل وقود متنقل MFP-50', descriptionEn: 'Mobile fuel polishing skid unit for on-site tank cleaning, 50 L/hr.', descriptionAr: 'وحدة هيكل صقل وقود متنقلة لتنظيف الخزان في الموقع، 50 لتر/ساعة.', sku: 'MFP-50', priceMin: 350, priceMax: 850 },
        ],
      },
      {
        nameEn: 'Biodiesel Filters',
        nameAr: 'فلاتر الديزل الحيوي',
        descriptionEn: 'Specialized filters for biodiesel and alternative fuel blends.',
        descriptionAr: 'فلاتر متخصصة للديزل الحيوي ومزيجات الوقود البديل.',
        products: [
          { nameEn: 'Biodiesel Compatible Filter BCF-10', nameAr: 'فلتر متوافق مع الديزل الحيوي BCF-10', descriptionEn: 'Biodiesel-compatible filter, resistant to B100 blends, Viton seals.', descriptionAr: 'فلتر متوافق مع الديزل الحيوي، مقاوم لمزيجات B100، أختام Viton.', sku: 'BCF-10', priceMin: 100, priceMax: 280 },
          { nameEn: 'High-Flow Biodiesel Filter HBF-30', nameAr: 'فلتر ديزل حيوي عالي التدفق HBF-30', descriptionEn: 'High-flow biodiesel fuel filter, 30 GPM, aluminum housing, 5-micron element.', descriptionAr: 'فلتر وقود ديزل حيوي عالي التدفق، 30 غالون/دقيقة، هيكل ألومنيوم، عنصر 5 ميكرون.', sku: 'HBF-30', priceMin: 200, priceMax: 480 },
        ],
      },
    ],
  },

  // ── 6. Dust Collectors ───────────────────────────────────────────────────────
  {
    nameEn: 'Dust Collectors',
    nameAr: 'مجمعات الغبار',
    descriptionEn: 'Industrial dust collection and air cleaning systems for manufacturing facilities.',
    descriptionAr: 'أنظمة تجميع الغبار وتنقية الهواء الصناعية لمرافق التصنيع.',
    subcategories: [
      {
        nameEn: 'Bag House Filters',
        nameAr: 'فلاتر البيت الكيسي',
        descriptionEn: 'Fabric bag filter systems for large-scale industrial dust collection.',
        descriptionAr: 'أنظمة فلتر كيس قماشي لتجميع الغبار الصناعي على نطاق واسع.',
        products: [
          { nameEn: 'Polyester Bag Filter PBF-200', nameAr: 'فلتر كيس بوليستر PBF-200', descriptionEn: 'Woven polyester bag filter, 200g/m², suitable for temperatures up to 135°C.', descriptionAr: 'فلتر كيس بوليستر منسوج، 200 غرام/م²، مناسب لدرجات حرارة حتى 135 درجة مئوية.', sku: 'PBF-200', priceMin: 80, priceMax: 220 },
          { nameEn: 'PTFE Membrane Bag Filter PMB-01', nameAr: 'فلتر كيس غشاء PTFE PMB-01', descriptionEn: 'PTFE membrane bag filter for sub-micron dust, 99.99% efficiency, continuous cleaning.', descriptionAr: 'فلتر كيس غشاء PTFE للغبار دون المايكرون، كفاءة 99.99%، تنظيف مستمر.', sku: 'PMB-01', priceMin: 180, priceMax: 450 },
        ],
      },
      {
        nameEn: 'Cartridge Dust Collectors',
        nameAr: 'مجمعات غبار خرطوشية',
        descriptionEn: 'Compact cartridge-style dust collectors for welding and machining applications.',
        descriptionAr: 'مجمعات غبار بأسلوب خرطوشة مدمجة لتطبيقات اللحام والتشغيل.',
        products: [
          { nameEn: 'Nanofiber Cartridge Filter NCF-03', nameAr: 'فلتر خرطوشة ألياف نانوية NCF-03', descriptionEn: 'Nanofiber cartridge dust collector filter, MERV-16, 99.97% at 0.3 micron.', descriptionAr: 'فلتر غبار خرطوشة ألياف نانوية، MERV-16، 99.97% عند 0.3 ميكرون.', sku: 'NCF-03', priceMin: 150, priceMax: 400 },
          { nameEn: 'Spun-Bond Cartridge SCF-05', nameAr: 'خرطوشة ألياف مدورة SCF-05', descriptionEn: 'Spun-bond polyester cartridge filter with anti-static treatment, for fine metal dust.', descriptionAr: 'فلتر خرطوشة بوليستر ألياف مدورة بمعالجة مضادة للكهرباء الساكنة، لغبار المعادن الدقيق.', sku: 'SCF-05', priceMin: 100, priceMax: 280 },
        ],
      },
      {
        nameEn: 'Cyclone Separators',
        nameAr: 'الفواصل الدوامية',
        descriptionEn: 'Pre-separators using centrifugal force to remove heavy particles.',
        descriptionAr: 'فواصل مسبقة تستخدم قوة الطرد المركزي لإزالة الجسيمات الثقيلة.',
        products: [
          { nameEn: 'Industrial Cyclone Separator ICS-05', nameAr: 'فاصل دوامي صناعي ICS-05', descriptionEn: 'Single-cone industrial cyclone separator, 5000 m³/hr capacity, carbon steel body.', descriptionAr: 'فاصل دوامي صناعي أحادي المخروط، سعة 5000 م³/ساعة، هيكل فولاذ كربوني.', sku: 'ICS-05', priceMin: 500, priceMax: 1200 },
          { nameEn: 'Multi-Cyclone Dust Separator MCD-10', nameAr: 'فاصل غبار دوامي متعدد MCD-10', descriptionEn: 'Multi-cyclone pre-separator with 10 parallel cells, high-efficiency separation.', descriptionAr: 'فاصل مسبق دوامي متعدد بـ 10 خلايا متوازية، فصل عالي الكفاءة.', sku: 'MCD-10', priceMin: 800, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Wet Scrubbers',
        nameAr: 'الغسالات الرطبة',
        descriptionEn: 'Wet scrubber systems for dust and gaseous pollutant removal.',
        descriptionAr: 'أنظمة غسالات رطبة لإزالة الغبار والملوثات الغازية.',
        products: [
          { nameEn: 'Venturi Wet Scrubber VWS-10', nameAr: 'غسالة رطبة فنتوري VWS-10', descriptionEn: 'Venturi throat wet scrubber for sticky, hygroscopic, or combustible dusts.', descriptionAr: 'غسالة رطبة حنجرة فنتوري للغبار اللاصق أو الاسترادي أو القابل للاشتعال.', sku: 'VWS-10', priceMin: 700, priceMax: 1500 },
          { nameEn: 'Packed Tower Scrubber PTS-05', nameAr: 'غسالة برج مُعبّأ PTS-05', descriptionEn: 'Packed tower wet scrubber for acid gas and dust combination treatment.', descriptionAr: 'غسالة برج مُعبّأ رطبة لمعالجة مجموعة الغاز الحمضي والغبار.', sku: 'PTS-05', priceMin: 900, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Electrostatic Precipitators',
        nameAr: 'المرسّبات الكهروستاتيكية',
        descriptionEn: 'Electrostatic precipitator systems for fine particle and smoke collection.',
        descriptionAr: 'أنظمة مرسّبات كهروستاتيكية لتجميع الجسيمات الدقيقة والدخان.',
        products: [
          { nameEn: 'ESP Unit Two-Stage ESP-2S', nameAr: 'وحدة مرسّب كهروستاتيكي ثنائي المرحلة ESP-2S', descriptionEn: 'Two-stage electrostatic precipitator for industrial smoke and oil mist, 15000 m³/hr.', descriptionAr: 'مرسّب كهروستاتيكي ثنائي المرحلة للدخان الصناعي ورذاذ الزيت، 15000 م³/ساعة.', sku: 'ESP-2S', priceMin: 1000, priceMax: 1500 },
          { nameEn: 'Ionizer Cell Filter ICF-08', nameAr: 'فلتر خلية مُأيّنة ICF-08', descriptionEn: 'Replacement ionizer cell for ESP units, graphite electrodes, easy-clean design.', descriptionAr: 'خلية مُأيّنة بديلة لوحدات مرسّب كهروستاتيكي، أقطاب جرافيت، تصميم سهل التنظيف.', sku: 'ICF-08', priceMin: 200, priceMax: 500 },
        ],
      },
    ],
  },

  // ── 7. Industrial Membranes ──────────────────────────────────────────────────
  {
    nameEn: 'Industrial Membranes',
    nameAr: 'الأغشية الصناعية',
    descriptionEn: 'Industrial filtration membranes for separation, purification, and concentration processes.',
    descriptionAr: 'أغشية ترشيح صناعية لعمليات الفصل والتنقية والتركيز.',
    subcategories: [
      {
        nameEn: 'Ultrafiltration Membranes',
        nameAr: 'أغشية الترشيح الفائق',
        descriptionEn: 'UF membranes for removal of suspended solids, bacteria, and macromolecules.',
        descriptionAr: 'أغشية UF لإزالة المواد الصلبة العالقة والبكتيريا والجزيئات الضخمة.',
        products: [
          { nameEn: 'UF Hollow Fiber Module UFM-8060', nameAr: 'وحدة ألياف مجوفة UF UFM-8060', descriptionEn: 'UF hollow fiber membrane module, 8" x 60" format, 150,000 Da MWCO.', descriptionAr: 'وحدة غشاء ألياف مجوفة UF، تنسيق 8"×60"، MWCO 150,000 دالتون.', sku: 'UFM-8060', priceMin: 400, priceMax: 950 },
          { nameEn: 'Flat Sheet UF Membrane FSU-01', nameAr: 'غشاء UF ورقة مسطحة FSU-01', descriptionEn: 'Flat sheet PVDF ultrafiltration membrane, 0.03 micron, 1 m² active area.', descriptionAr: 'غشاء ترشيح فائق PVDF ورقة مسطحة، 0.03 ميكرون، مساحة نشطة 1 م².', sku: 'FSU-01', priceMin: 200, priceMax: 500 },
        ],
      },
      {
        nameEn: 'Nanofiltration Membranes',
        nameAr: 'أغشية الترشيح النانوي',
        descriptionEn: 'NF membranes for hardness removal and organic compound reduction.',
        descriptionAr: 'أغشية NF لإزالة العسرة وتقليل المركبات العضوية.',
        products: [
          { nameEn: 'NF Spiral Wound Element NFE-4040', nameAr: 'عنصر NF لولبي NFE-4040', descriptionEn: 'Nanofiltration spiral wound element, 4"x40", 1200 Da MWCO, 97% MgSO4 rejection.', descriptionAr: 'عنصر نانوفلترة لولبي، 4"×40"، MWCO 1200 دالتون، رفض MgSO4 97%.', sku: 'NFE-4040', priceMin: 350, priceMax: 800 },
          { nameEn: 'Industrial NF Module INM-8040', nameAr: 'وحدة NF صناعية INM-8040', descriptionEn: 'Industrial nanofiltration membrane module, 8"x40", high-flow design for process water.', descriptionAr: 'وحدة غشاء نانوفلترة صناعية، 8"×40"، تصميم عالي التدفق لمياه العملية.', sku: 'INM-8040', priceMin: 650, priceMax: 1400 },
        ],
      },
      {
        nameEn: 'Microfiltration Membranes',
        nameAr: 'أغشية الترشيح الدقيق',
        descriptionEn: 'MF membranes for particle and microorganism removal (0.1–10 micron).',
        descriptionAr: 'أغشية MF لإزالة الجسيمات والكائنات الدقيقة (0.1–10 ميكرون).',
        products: [
          { nameEn: 'MF Tubular Membrane MTM-03', nameAr: 'غشاء أنبوبي MF MTM-03', descriptionEn: 'MF tubular membrane, 0.1-micron, ceramic support structure, chemical resistant.', descriptionAr: 'غشاء أنبوبي MF، 0.1 ميكرون، بنية دعم خزفية، مقاومة للمواد الكيميائية.', sku: 'MTM-03', priceMin: 300, priceMax: 700 },
          { nameEn: 'Pleated MF Cartridge PMC-02', nameAr: 'خرطوشة MF مطوية PMC-02', descriptionEn: 'Pleated microfiltration cartridge, 0.2-micron, hydrophilic PVDF, 10" size.', descriptionAr: 'خرطوشة ترشيح دقيق مطوية، 0.2 ميكرون، PVDF محبة للماء، مقاس 10 بوصة.', sku: 'PMC-02', priceMin: 120, priceMax: 300 },
        ],
      },
      {
        nameEn: 'Gas Separation Membranes',
        nameAr: 'أغشية فصل الغاز',
        descriptionEn: 'Polymeric and ceramic membranes for gas separation and enrichment.',
        descriptionAr: 'أغشية بوليمرية وخزفية لفصل الغاز وإثرائه.',
        products: [
          { nameEn: 'Nitrogen Generation Membrane NGM-01', nameAr: 'غشاء توليد النيتروجين NGM-01', descriptionEn: 'Hollow fiber membrane for nitrogen generation from compressed air, 99.9% purity.', descriptionAr: 'غشاء ألياف مجوفة لتوليد النيتروجين من الهواء المضغوط، نقاء 99.9%.', sku: 'NGM-01', priceMin: 500, priceMax: 1200 },
          { nameEn: 'CO2 Separation Module CSM-10', nameAr: 'وحدة فصل CO2 CSM-10', descriptionEn: 'Polymeric membrane module for CO2/CH4 separation in biogas upgrading.', descriptionAr: 'وحدة غشاء بوليمرية لفصل CO2/CH4 في ترقية الغاز الحيوي.', sku: 'CSM-10', priceMin: 700, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Ceramic Membranes',
        nameAr: 'الأغشية الخزفية',
        descriptionEn: 'High-temperature and chemically resistant ceramic filtration membranes.',
        descriptionAr: 'أغشية ترشيح خزفية مقاومة للحرارة العالية والمواد الكيميائية.',
        products: [
          { nameEn: 'Alpha-Alumina Ceramic Membrane ACM-01', nameAr: 'غشاء خزفي ألفا ألومينا ACM-01', descriptionEn: 'Alpha-alumina ceramic membrane tube, 0.05-micron rating, 600°C max temperature.', descriptionAr: 'أنبوب غشاء خزفي ألفا ألومينا، تصنيف 0.05 ميكرون، درجة حرارة أقصى 600 درجة مئوية.', sku: 'ACM-01', priceMin: 400, priceMax: 950 },
          { nameEn: 'Zirconia Ceramic Membrane ZCM-05', nameAr: 'غشاء خزفي زيركونيا ZCM-05', descriptionEn: 'Zirconia-coated ceramic UF membrane, 20 nm pore size, pH 0-14 compatibility.', descriptionAr: 'غشاء UF خزفي مطلي بالزيركونيا، حجم مسام 20 نانومتر، توافق pH 0-14.', sku: 'ZCM-05', priceMin: 600, priceMax: 1400 },
        ],
      },
    ],
  },

  // ── 8. Gas Filters ───────────────────────────────────────────────────────────
  {
    nameEn: 'Gas Filters',
    nameAr: 'فلاتر الغاز',
    descriptionEn: 'Filtration systems for natural gas, process gas, and specialty gas applications.',
    descriptionAr: 'أنظمة ترشيح للغاز الطبيعي وغاز العملية وتطبيقات الغاز المتخصص.',
    subcategories: [
      {
        nameEn: 'Natural Gas Filters',
        nameAr: 'فلاتر الغاز الطبيعي',
        descriptionEn: 'Pipeline filters for natural gas distribution and metering stations.',
        descriptionAr: 'فلاتر خطوط أنابيب لمحطات توزيع وقياس الغاز الطبيعي.',
        products: [
          { nameEn: 'Gas Line Filter GLF-2IN', nameAr: 'فلتر خط غاز GLF-2IN', descriptionEn: 'Natural gas line filter, 2" ANSI flanges, 10-micron coalescing element, ATEX certified.', descriptionAr: 'فلتر خط غاز طبيعي، فلانشات ANSI 2 بوصة، عنصر تجمع 10 ميكرون، معتمد ATEX.', sku: 'GLF-2IN', priceMin: 300, priceMax: 750 },
          { nameEn: 'High-Capacity Gas Filter HGF-06', nameAr: 'فلتر غاز عالي السعة HGF-06', descriptionEn: 'High-capacity gas filter separator for mainline transmission, 6" inlet, ANSI 600.', descriptionAr: 'فاصل فلتر غاز عالي السعة للإرسال في الخط الرئيسي، مدخل 6 بوصة، ANSI 600.', sku: 'HGF-06', priceMin: 700, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Compressed Gas Filters',
        nameAr: 'فلاتر الغاز المضغوط',
        descriptionEn: 'Coalescing and particulate filters for compressed gas systems.',
        descriptionAr: 'فلاتر تجمع وجسيمات لأنظمة الغاز المضغوط.',
        products: [
          { nameEn: 'Compressed Gas Coalescing Filter CGF-01', nameAr: 'فلتر تجمع غاز مضغوط CGF-01', descriptionEn: 'Coalescing filter for compressed nitrogen and argon lines, 0.01 micron aerosol rating.', descriptionAr: 'فلتر تجمع لخطوط النيتروجين والأرغون المضغوطة، تصنيف هباء جوي 0.01 ميكرون.', sku: 'CGF-01', priceMin: 200, priceMax: 500 },
          { nameEn: 'SS Sintered Gas Filter SGF-SS', nameAr: 'فلتر غاز ملبّد SS SGF-SS', descriptionEn: 'Stainless steel sintered particulate gas filter for ultra-high-purity gas systems.', descriptionAr: 'فلتر غاز جسيمات ملبّد فولاذ مقاوم للصدأ لأنظمة الغاز فائقة النقاء.', sku: 'SGF-SS', priceMin: 280, priceMax: 650 },
        ],
      },
      {
        nameEn: 'Process Gas Filters',
        nameAr: 'فلاتر غاز العملية',
        descriptionEn: 'Specialty filters for process gas in petrochemical and refinery applications.',
        descriptionAr: 'فلاتر متخصصة لغاز العملية في تطبيقات بتروكيماويات والمصافي.',
        products: [
          { nameEn: 'Process Gas Filter PGF-04', nameAr: 'فلتر غاز عملية PGF-04', descriptionEn: 'Stainless process gas filter, 4" NPT, rated for H2S and CO2 service.', descriptionAr: 'فلتر غاز عملية فولاذي، NPT 4 بوصة، مصنّف لخدمة H2S وCO2.', sku: 'PGF-04', priceMin: 400, priceMax: 1000 },
          { nameEn: 'Duplex Gas Filter DGF-08', nameAr: 'فلتر غاز مزدوج DGF-08', descriptionEn: 'Duplex switchable gas filter housing, 8" line size, allows filter change under pressure.', descriptionAr: 'سكن فلتر غاز مزدوج قابل للتبديل، حجم خط 8 بوصة، يسمح بتغيير الفلتر تحت الضغط.', sku: 'DGF-08', priceMin: 800, priceMax: 1500 },
        ],
      },
      {
        nameEn: 'Biogas Filters',
        nameAr: 'فلاتر الغاز الحيوي',
        descriptionEn: 'H2S and siloxane removal filters for biogas upgrading.',
        descriptionAr: 'فلاتر إزالة H2S والسيلوكسان لترقية الغاز الحيوي.',
        products: [
          { nameEn: 'H2S Removal Filter HRF-BG', nameAr: 'فلتر إزالة H2S HRF-BG', descriptionEn: 'Iron oxide-based H2S removal filter for biogas, 50 kg iron sponge media.', descriptionAr: 'فلتر إزالة H2S على أساس أكسيد الحديد للغاز الحيوي، 50 كغ وسيط إسفنج حديد.', sku: 'HRF-BG', priceMin: 250, priceMax: 600 },
          { nameEn: 'Siloxane Guard Filter SGF-02', nameAr: 'فلتر واقي السيلوكسان SGF-02', descriptionEn: 'Activated carbon siloxane filter for protecting combined heat and power (CHP) engines.', descriptionAr: 'فلتر سيلوكسان كربون مفعّل لحماية محركات الطاقة والحرارة المشتركة (CHP).', sku: 'SGF-02', priceMin: 300, priceMax: 750 },
        ],
      },
      {
        nameEn: 'Laboratory Gas Filters',
        nameAr: 'فلاتر غاز المختبر',
        descriptionEn: 'High-purity inline filters for laboratory gas distribution systems.',
        descriptionAr: 'فلاتر خطية عالية النقاء لأنظمة توزيع غاز المختبر.',
        products: [
          { nameEn: 'Lab Gas Purifier LGP-01', nameAr: 'منقي غاز مختبر LGP-01', descriptionEn: 'Lab gas purifier for nitrogen and argon, removes O2 and moisture below 1 ppb.', descriptionAr: 'منقي غاز مختبر للنيتروجين والأرغون، يزيل O2 والرطوبة دون 1 ppb.', sku: 'LGP-01', priceMin: 180, priceMax: 450 },
          { nameEn: 'In-Line Gas Filter ILG-03', nameAr: 'فلتر غاز خطي ILG-03', descriptionEn: 'Stainless steel in-line gas filter, 1/4" Swagelok fittings, 0.5-micron sintered element.', descriptionAr: 'فلتر غاز خطي فولاذ مقاوم للصدأ، توصيلات Swagelok 1/4 بوصة، عنصر ملبّد 0.5 ميكرون.', sku: 'ILG-03', priceMin: 120, priceMax: 300 },
        ],
      },
    ],
  },

  // ── 9. HVAC Filters ──────────────────────────────────────────────────────────
  {
    nameEn: 'HVAC Filters',
    nameAr: 'فلاتر التكييف والتهوية',
    descriptionEn: 'Air handling unit filters for commercial and industrial HVAC systems.',
    descriptionAr: 'فلاتر وحدات معالجة الهواء لأنظمة التكييف والتهوية التجارية والصناعية.',
    subcategories: [
      {
        nameEn: 'Pre-Filters (G-Class)',
        nameAr: 'الفلاتر المبدئية (فئة G)',
        descriptionEn: 'Coarse-grade pre-filters for HVAC systems to extend service life of final filters.',
        descriptionAr: 'فلاتر مبدئية خشنة لأنظمة HVAC لإطالة عمر خدمة الفلاتر النهائية.',
        products: [
          { nameEn: 'G4 Pre-Filter Panel GPP-G4', nameAr: 'لوح فلتر مبدئي G4 GPP-G4', descriptionEn: 'G4-class pre-filter panel, synthetic media, reusable frame, 592x592x48mm.', descriptionAr: 'لوح فلتر مبدئي فئة G4، وسيط اصطناعي، إطار قابل للاستخدام مجدداً، 592×592×48 ملم.', sku: 'GPP-G4', priceMin: 50, priceMax: 130 },
          { nameEn: 'Roll Media Pre-Filter RMP-G3', nameAr: 'فلتر مبدئي لفافة وسيط RMP-G3', descriptionEn: 'G3 synthetic roll media pre-filter, 2m x 20m roll, gravity-feed or motorized use.', descriptionAr: 'فلتر مبدئي لفافة وسيط اصطناعي G3، لفافة 2 م × 20 م، للاستخدام بالجاذبية أو المحرك.', sku: 'RMP-G3', priceMin: 80, priceMax: 220 },
        ],
      },
      {
        nameEn: 'Fine Filters (F-Class)',
        nameAr: 'الفلاتر الناعمة (فئة F)',
        descriptionEn: 'F7-F9 class fine filters for office buildings, hospitals, and clean environments.',
        descriptionAr: 'فلاتر ناعمة فئة F7-F9 للمباني المكتبية والمستشفيات والبيئات النظيفة.',
        products: [
          { nameEn: 'F7 Bag Filter BF-F7', nameAr: 'فلتر كيس F7 BF-F7', descriptionEn: 'F7-rated bag filter, 6-pocket, fiberglass media, 592x592x500mm, 3450 m³/hr airflow.', descriptionAr: 'فلتر كيس بتصنيف F7، 6 جيوب، وسيط زجاج ليفي، 592×592×500 ملم، تدفق هواء 3450 م³/ساعة.', sku: 'BF-F7', priceMin: 90, priceMax: 250 },
          { nameEn: 'F9 Compact Filter CPF-F9', nameAr: 'فلتر مدمج F9 CPF-F9', descriptionEn: 'F9 class compact filter with mini-pleat fiberglass, 592x592x292mm, ePM1 >65%.', descriptionAr: 'فلتر مدمج فئة F9 بطية مصغرة من الزجاج الليفي، 592×592×292 ملم، ePM1 >65%.', sku: 'CPF-F9', priceMin: 150, priceMax: 380 },
        ],
      },
      {
        nameEn: 'HEPA Filters',
        nameAr: 'فلاتر HEPA',
        descriptionEn: 'H13/H14 HEPA filters for cleanrooms, operating theaters, and pharmaceutical facilities.',
        descriptionAr: 'فلاتر HEPA H13/H14 للغرف النظيفة وغرف العمليات ومنشآت الأدوية.',
        products: [
          { nameEn: 'H13 HEPA Box Filter HBF-H13', nameAr: 'فلتر صندوق HEPA H13 HBF-H13', descriptionEn: 'H13 HEPA box filter, 610x610x78mm, thermoplastic frame, 99.95% tested efficiency.', descriptionAr: 'فلتر صندوق HEPA H13، 610×610×78 ملم، إطار ثرموبلاستيك، كفاءة مختبرة 99.95%.', sku: 'HBF-H13', priceMin: 280, priceMax: 700 },
          { nameEn: 'H14 HEPA Terminal Filter HTF-H14', nameAr: 'فلتر نهائي HEPA H14 HTF-H14', descriptionEn: 'H14 terminal HEPA filter with integral gasket, 610x610x150mm, ISO Class 5 compliant.', descriptionAr: 'فلتر HEPA نهائي H14 مع حشية متكاملة، 610×610×150 ملم، متوافق مع ISO Class 5.', sku: 'HTF-H14', priceMin: 450, priceMax: 1100 },
        ],
      },
      {
        nameEn: 'Activated Carbon HVAC Filters',
        nameAr: 'فلاتر الكربون المفعّل لأنظمة HVAC',
        descriptionEn: 'Carbon-impregnated HVAC filters for odor, VOC, and gas phase contaminant removal.',
        descriptionAr: 'فلاتر HVAC مشبعة بالكربون لإزالة الروائح والمركبات العضوية المتطايرة وملوثات المرحلة الغازية.',
        products: [
          { nameEn: 'Carbon Tray Filter CTF-01', nameAr: 'فلتر صينية كربون CTF-01', descriptionEn: 'Activated carbon tray filter module, 610x305x48mm, 2.5 kg carbon loading.', descriptionAr: 'وحدة فلتر صينية كربون مفعّل، 610×305×48 ملم، تحميل كربون 2.5 كغ.', sku: 'CTF-01', priceMin: 120, priceMax: 320 },
          { nameEn: 'Combination HEPA-Carbon Filter CHC-01', nameAr: 'فلتر HEPA-كربون مجمّع CHC-01', descriptionEn: 'Combined HEPA + activated carbon filter for simultaneous particle and gas phase removal.', descriptionAr: 'فلتر HEPA + كربون مفعّل مجمّع لإزالة الجسيمات والمرحلة الغازية في آنٍ واحد.', sku: 'CHC-01', priceMin: 350, priceMax: 800 },
        ],
      },
      {
        nameEn: 'Electrostatic HVAC Filters',
        nameAr: 'فلاتر HVAC الكهروستاتيكية',
        descriptionEn: 'Washable electrostatic air filters for residential and light commercial use.',
        descriptionAr: 'فلاتر هواء كهروستاتيكية قابلة للغسيل للاستخدام السكني والتجاري الخفيف.',
        products: [
          { nameEn: 'Washable Electrostatic Filter WEF-20x25', nameAr: 'فلتر كهروستاتيكي قابل للغسيل WEF-20x25', descriptionEn: 'Washable electrostatic filter 20"x25"x1", reusable, MERV-8 equivalent, polypropylene layers.', descriptionAr: 'فلتر كهروستاتيكي قابل للغسيل 20"×25"×1"، قابل لإعادة الاستخدام، معادل MERV-8، طبقات بولي بروبيلين.', sku: 'WEF-2025', priceMin: 60, priceMax: 160 },
          { nameEn: 'Electronic Air Cleaner Media EAC-16', nameAr: 'وسيط منقي هواء إلكتروني EAC-16', descriptionEn: 'Replacement media for electronic air cleaners, 16"x25" size, MERV-11 pre-charged.', descriptionAr: 'وسيط بديل لمنقيات الهواء الإلكترونية، مقاس 16"×25"، MERV-11 مشحون مسبقاً.', sku: 'EAC-16', priceMin: 50, priceMax: 140 },
        ],
      },
    ],
  },

  // ── 10. Chemical Filters ─────────────────────────────────────────────────────
  {
    nameEn: 'Chemical Filters',
    nameAr: 'فلاتر الكيماويات',
    descriptionEn: 'Chemically resistant filtration equipment for aggressive fluid and gas processing.',
    descriptionAr: 'معدات ترشيح مقاومة للمواد الكيميائية لمعالجة السوائل والغازات العدوانية.',
    subcategories: [
      {
        nameEn: 'Acid Resistant Filters',
        nameAr: 'فلاتر مقاومة للحمض',
        descriptionEn: 'Filters fabricated from PVDF, PP, and PTFE for acid service.',
        descriptionAr: 'فلاتر مصنوعة من PVDF وPP وPTFE لخدمة الأحماض.',
        products: [
          { nameEn: 'PVDF Acid Filter PAF-HCL', nameAr: 'فلتر حمض PVDF PAF-HCL', descriptionEn: 'PVDF housing acid filter with PP cartridge, suitable for HCl and H2SO4 service.', descriptionAr: 'فلتر حمض بسكن PVDF مع خرطوشة PP، مناسب لخدمة HCl وH2SO4.', sku: 'PAF-HCL', priceMin: 200, priceMax: 500 },
          { nameEn: 'PTFE Filter Housing PTF-01', nameAr: 'سكن فلتر PTFE PTF-01', descriptionEn: 'All-PTFE single cartridge filter housing for aggressive acid filtration, 10" size.', descriptionAr: 'سكن فلتر خرطوشة واحدة كامل PTFE لترشيح الأحماض القوية، مقاس 10 بوصة.', sku: 'PTF-01', priceMin: 350, priceMax: 850 },
        ],
      },
      {
        nameEn: 'Alkali Filters',
        nameAr: 'فلاتر القلويات',
        descriptionEn: 'High-alkalinity resistant filters for caustic soda and bleach applications.',
        descriptionAr: 'فلاتر مقاومة للقلوية العالية لتطبيقات الصودا الكاوية والمبيّض.',
        products: [
          { nameEn: 'Polypropylene Alkali Filter ABF-PP', nameAr: 'فلتر قلوي بولي بروبيلين ABF-PP', descriptionEn: 'All-polypropylene filter housing rated for NaOH up to 50% concentration, 20" size.', descriptionAr: 'سكن فلتر كامل بولي بروبيلين مصنّف لـ NaOH حتى 50% تركيز، مقاس 20 بوصة.', sku: 'ABF-PP', priceMin: 150, priceMax: 380 },
          { nameEn: 'Multi-Bag Alkali Filter MBA-04', nameAr: 'فلتر كيس قلوي متعدد MBA-04', descriptionEn: '4-bag multi-bag filter for high-flow caustic applications in chemical plants.', descriptionAr: 'فلتر كيس متعدد 4 أكياس للتطبيقات الكاوية عالية التدفق في المصانع الكيميائية.', sku: 'MBA-04', priceMin: 400, priceMax: 950 },
        ],
      },
      {
        nameEn: 'Solvent Filters',
        nameAr: 'فلاتر المذيبات',
        descriptionEn: 'Explosion-proof and solvent-resistant filters for solvent recovery systems.',
        descriptionAr: 'فلاتر مقاومة للانفجار والمذيبات لأنظمة استعادة المذيبات.',
        products: [
          { nameEn: 'Stainless Solvent Filter SSF-04', nameAr: 'فلتر مذيب فولاذي SSF-04', descriptionEn: 'All-stainless solvent filter, 4-stage, ATEX-rated, for ketones and esters.', descriptionAr: 'فلتر مذيب كامل فولاذي، 4 مراحل، مصنّف ATEX، للكيتونات والإسترات.', sku: 'SSF-04', priceMin: 450, priceMax: 1100 },
          { nameEn: 'Solvent Recovery Filter SRF-10', nameAr: 'فلتر استعادة مذيبات SRF-10', descriptionEn: 'High-efficiency solvent recovery inline filter, removes catalyst particles, 10-micron.', descriptionAr: 'فلتر خطي فعّال لاستعادة المذيبات، يزيل جسيمات المحفز، 10 ميكرون.', sku: 'SRF-10', priceMin: 300, priceMax: 750 },
        ],
      },
      {
        nameEn: 'High-Temperature Filters',
        nameAr: 'فلاتر درجات الحرارة العالية',
        descriptionEn: 'Filters rated for operation above 200°C in thermal process industries.',
        descriptionAr: 'فلاتر مصنّفة للتشغيل فوق 200 درجة مئوية في صناعات العمليات الحرارية.',
        products: [
          { nameEn: 'Hot Gas Filter Candle HGC-01', nameAr: 'شمعة فلتر غاز ساخن HGC-01', descriptionEn: 'Ceramic candle filter for hot gas filtration up to 900°C, 60mm OD, 1.5m length.', descriptionAr: 'فلتر شمعة خزفية لترشيح الغاز الساخن حتى 900 درجة مئوية، قطر 60 ملم، طول 1.5 م.', sku: 'HGC-01', priceMin: 500, priceMax: 1200 },
          { nameEn: 'Sintered Metal Filter SMF-300C', nameAr: 'فلتر معدن ملبّد SMF-300C', descriptionEn: 'Sintered stainless steel filter element rated to 300°C, 5-micron, for chemical reactors.', descriptionAr: 'عنصر فلتر فولاذي ملبّد مصنّف حتى 300 درجة مئوية، 5 ميكرون، للمفاعلات الكيميائية.', sku: 'SMF-300C', priceMin: 350, priceMax: 880 },
        ],
      },
      {
        nameEn: 'Corrosion-Resistant Filters',
        nameAr: 'فلاتر مقاومة للتآكل',
        descriptionEn: 'Hastelloy, titanium, and duplex stainless steel filters for ultra-corrosive service.',
        descriptionAr: 'فلاتر Hastelloy والتيتانيوم والفولاذ المزدوج للخدمة فائقة التآكل.',
        products: [
          { nameEn: 'Hastelloy Duplex Filter HDF-C22', nameAr: 'فلتر مزدوج Hastelloy HDF-C22', descriptionEn: 'Hastelloy C-22 duplex switchable filter for chloride and fluoride containing fluids.', descriptionAr: 'فلتر مزدوج قابل للتبديل Hastelloy C-22 للسوائل المحتوية على كلوريد وفلوريد.', sku: 'HDF-C22', priceMin: 800, priceMax: 1500 },
          { nameEn: 'Titanium Strainer TIS-02', nameAr: 'مصفاة تيتانيوم TIS-02', descriptionEn: 'Titanium basket strainer for seawater and brine service, 2" ANSI 150 flange.', descriptionAr: 'مصفاة سلة تيتانيوم لخدمة مياه البحر والمحلول الملحي، فلانش ANSI 150 2 بوصة.', sku: 'TIS-02', priceMin: 600, priceMax: 1400 },
        ],
      },
    ],
  },
];

// ─── Users ────────────────────────────────────────────────────────────────────
interface UserDef {
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  phone: string;
  profileImage?: string;
}

const TEST_USERS: UserDef[] = [
  // Customers
  { email: 'customer1@shielder.test', password: 'Customer@1234', role: UserRole.USER, status: UserStatus.ACTIVE, fullName: 'Ahmed Al-Rashidi', phone: '+966501234567', profileImage: USER_IMAGES[0] },
  { email: 'customer2@shielder.test', password: 'Customer@1234', role: UserRole.USER, status: UserStatus.ACTIVE, fullName: 'Sara Al-Mutairi', phone: '+966509876543', profileImage: USER_IMAGES[1] },
  { email: 'customer3@shielder.test', password: 'Customer@1234', role: UserRole.USER, status: UserStatus.ACTIVE, fullName: 'Mohammed Al-Qahtani', phone: '+966551234567', profileImage: USER_IMAGES[2] },
  { email: 'customer4@shielder.test', password: 'Customer@1234', role: UserRole.USER, status: UserStatus.ACTIVE, fullName: 'Fatima Al-Harbi', phone: '+966558765432', profileImage: USER_IMAGES[3] },
  { email: 'customer5@shielder.test', password: 'Customer@1234', role: UserRole.USER, status: UserStatus.ACTIVE, fullName: 'Khalid Al-Ghamdi', phone: '+966561234567', profileImage: USER_IMAGES[4] },
  // Admins
  { email: 'admin1@shielder.test', password: 'Admin@Shielder1', role: UserRole.ADMIN, status: UserStatus.ACTIVE, fullName: 'Ali Hassan Admin', phone: '+966571234567' },
  { email: 'admin2@shielder.test', password: 'Admin@Shielder2', role: UserRole.ADMIN, status: UserStatus.ACTIVE, fullName: 'Nora Al-Zahrani Admin', phone: '+966579876543' },
  // Super Admin (skip if exists)
  { email: 'superadmin@shielder.com', password: 'SuperAdmin@2026', role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, fullName: 'Super Admin', phone: '+0000000000' },
];

// ════════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ════════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║      Shielder — Test Data Seed Script        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const createdUserEmails: string[] = [];

  // Guard: ensure there is never more than one SUPER_ADMIN in the system.
  // If ANY super admin already exists (regardless of email), skip creating another.
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
    select: { email: true },
  });
  if (existingSuperAdmin) {
    console.log(`   ⏭  Super Admin already exists (${existingSuperAdmin.email}) — skipping`);
  }

  for (const u of TEST_USERS) {
    // Skip super admin creation if one already exists anywhere in the DB
    if (u.role === UserRole.SUPER_ADMIN && existingSuperAdmin) {
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`   ⏭  Skipped (exists): ${u.email}`);
      continue;
    }

    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: hash,
        role: u.role,
        status: u.status,
        isActive: true,
        emailVerified: true,
        createdAt: SEED_DATE,
        updatedAt: SEED_DATE,
        profile: {
          create: {
            fullName: u.fullName,
            phoneNumber: u.phone,
            profileImage: u.profileImage ?? null,
            preferredLanguage: 'en',
            companyName: 'Shielder',
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
          },
        },
      },
    });
    createdUserEmails.push(u.email);
    console.log(`   ✅ Created [${u.role}]: ${u.email}`);
  }

  // ── 2. Categories → Subcategories → Products ──────────────────────────────
  let totalCategories = 0;
  let totalSubcategories = 0;
  let totalProducts = 0;
  let productIndex = 0; // global counter for image cycling and featured determination

  console.log('\n📦 Seeding categories, subcategories, and products...\n');

  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const catDef = CATEGORIES[ci];

    // ─ Category ─────────────────────────────────────────────────────────────
    // Check if category already exists by EN name
    const existingCat = await prisma.category.findFirst({
      where: {
        translations: {
          some: { locale: 'en', name: catDef.nameEn },
        },
      },
    });

    let categoryId: string;

    if (existingCat) {
      categoryId = existingCat.id;
      console.log(`   ⏭  Category exists: ${catDef.nameEn}`);
    } else {
      const category = await prisma.category.create({
        data: {
          image: img(CATEGORY_IMAGES, ci),
          isActive: true,
          createdAt: SEED_DATE,
          updatedAt: SEED_DATE,
          translations: {
            create: [
              { locale: 'en', name: catDef.nameEn, description: catDef.descriptionEn },
              { locale: 'ar', name: catDef.nameAr, description: catDef.descriptionAr },
            ],
          },
        },
      });
      categoryId = category.id;
      totalCategories++;
      console.log(`   ✅ Category [${ci + 1}/10]: ${catDef.nameEn}`);
    }

    // ─ Subcategories ─────────────────────────────────────────────────────────
    for (let si = 0; si < catDef.subcategories.length; si++) {
      const subDef = catDef.subcategories[si];
      const subImageIdx = ci * 5 + si;

      const existingSub = await prisma.subcategory.findFirst({
        where: {
          categoryId,
          translations: {
            some: { locale: 'en', name: subDef.nameEn },
          },
        },
      });

      let subcategoryId: string;

      if (existingSub) {
        subcategoryId = existingSub.id;
      } else {
        const subcategory = await prisma.subcategory.create({
          data: {
            categoryId,
            image: img(CATEGORY_IMAGES, subImageIdx),
            isActive: true,
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
            translations: {
              create: [
                { locale: 'en', name: subDef.nameEn, description: subDef.descriptionEn },
                { locale: 'ar', name: subDef.nameAr, description: subDef.descriptionAr },
              ],
            },
          },
        });
        subcategoryId = subcategory.id;
        totalSubcategories++;
      }

      // ─ Products ────────────────────────────────────────────────────────────
      for (let pi = 0; pi < subDef.products.length; pi++) {
        const prodDef = subDef.products[pi];

        const existingProd = await prisma.product.findFirst({
          where: { sku: prodDef.sku },
        });

        if (existingProd) {
          productIndex++;
          continue;
        }

        // 20% of products get higher stock (simulating "featured" prominence)
        const isFeaturedBatch = productIndex % 5 === 0;
        const stock = isFeaturedBatch ? randInt(100, 200) : randInt(10, 99);
        const price = randPrice(prodDef.priceMin, prodDef.priceMax);

        await prisma.product.create({
          data: {
            categoryId,
            subcategoryId,
            sku: prodDef.sku,
            price,
            stock,
            minimumStockThreshold: 5,
            status: ProductStatus.PUBLISHED,
            isActive: true,
            mainImage: img(PRODUCT_IMAGES, productIndex),
            createdAt: SEED_DATE,
            updatedAt: SEED_DATE,
            translations: {
              create: [
                { locale: 'en', name: prodDef.nameEn, description: prodDef.descriptionEn },
                { locale: 'ar', name: prodDef.nameAr, description: prodDef.descriptionAr },
              ],
            },
          },
        });

        totalProducts++;
        productIndex++;
      }
    }
  }

  // ── 3. Summary ───────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║              Seed Complete ✅                 ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Categories created  : ${String(totalCategories).padEnd(21)}║`);
  console.log(`║  Subcategories created: ${String(totalSubcategories).padEnd(20)}║`);
  console.log(`║  Products created    : ${String(totalProducts).padEnd(21)}║`);
  console.log(`║  Users created       : ${String(createdUserEmails.length).padEnd(21)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n🔑 Test Credentials:');
  console.log('   Customer  : customer1@shielder.test  / Customer@1234');
  console.log('   Admin     : admin1@shielder.test     / Admin@Shielder1');
  console.log('   Super Admin: superadmin@shielder.com / SuperAdmin@2026\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
