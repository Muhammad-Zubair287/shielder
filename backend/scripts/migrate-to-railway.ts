/**
 * migrate-to-railway.ts
 * Copies all data from local PostgreSQL (shielderDB) → Railway PostgreSQL
 * Run: npx tsx scripts/migrate-to-railway.ts
 */

import { PrismaClient } from '@prisma/client';

const LOCAL_URL   = 'postgresql://postgres:jerry2244@127.0.0.1:5432/shielderDB';
const RAILWAY_URL = 'postgresql://postgres:gDgTUsVbJXqJNgBsiZcJbEtuXVlufdfE@shinkansen.proxy.rlwy.net:14339/railway';

const local   = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });
const railway = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } });

// ── copy helper — uses Prisma model API so enums/JSON/dates are handled correctly ─

async function copy(
  label: string,
  readFn: () => Promise<any[]>,
  writeFn: (rows: any[]) => Promise<{ count: number }>,
) {
  try {
    const rows = await readFn();
    if (rows.length === 0) {
      console.log(`  ${label.padEnd(35)} 0 rows (skip)`);
      return;
    }
    const res = await writeFn(rows);
    console.log(`  ${label.padEnd(35)} ${res.count} rows ✅`);
  } catch (e: any) {
    const msg = (e.message || '').replace(/\n/g, ' ').slice(0, 500);
    console.log(`  ${label.padEnd(35)} ⚠️  ${msg}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔌 Connecting...');
  await local.$connect();   console.log('  ✅ Local DB  (shielderDB @ 127.0.0.1)');
  await railway.$connect(); console.log('  ✅ Railway DB');

  // 1. Push migrations to Railway so all tables exist
  console.log('\n📦 Applying migrations to Railway...');
  const { execSync } = require('child_process');
  execSync(
    `DATABASE_URL="${RAILWAY_URL}" npx prisma migrate deploy --schema=src/database/prisma/schema.prisma`,
    { stdio: 'inherit', cwd: process.cwd() }
  );

  // 2. Wipe Railway data (reverse FK order) so we can re-insert cleanly
  console.log('\n🗑️  Clearing Railway tables...');
  const wipeOrder = [
    'audit_logs','refresh_tokens','notification_preferences','notifications',
    'quotation_activities','quotation_items','quotations',
    'payments','order_items','orders',
    'cart_items','carts',
    'product_attachments','product_specifications','product_variants','product_translations',
    'products','stock_history','expenses',
    'category_spec_templates','subcategory_translations','subcategories',
    'category_translations','categories',
    'brand_translations','brands',
    'system_config_snapshots','system_settings',
    'user_profiles','admins','users',
  ];
  for (const t of wipeOrder) {
    try { await railway.$executeRawUnsafe(`DELETE FROM "${t}"`); } catch {}
  }
  console.log('  ✅ Done');

  // 3. Copy data — FK-safe insertion order
  console.log('\n📤 Copying data local → Railway...\n');

  await copy('users',                    () => local.user.findMany(),                    r => railway.user.createMany({ data: r, skipDuplicates: true }));
  await copy('user_profiles',            () => local.userProfile.findMany(),             r => railway.userProfile.createMany({ data: r, skipDuplicates: true }));
  await copy('admins (skip - part of users)',   () => Promise.resolve([]), _ => Promise.resolve({ count: 0 }));
  await copy('brands',                   () => local.brands.findMany(),                  r => railway.brands.createMany({ data: r, skipDuplicates: true }));
  await copy('brand_translations',       () => local.brand_translations.findMany(),      r => railway.brand_translations.createMany({ data: r, skipDuplicates: true }));
  await copy('categories',               () => local.category.findMany(),                r => railway.category.createMany({ data: r, skipDuplicates: true }));
  await copy('category_translations',    () => local.categoryTranslation.findMany(),     r => railway.categoryTranslation.createMany({ data: r, skipDuplicates: true }));
  await copy('subcategories',            () => local.subcategory.findMany(),             r => railway.subcategory.createMany({ data: r, skipDuplicates: true }));
  await copy('subcategory_translations', () => local.subcategoryTranslation.findMany(),  r => railway.subcategoryTranslation.createMany({ data: r, skipDuplicates: true }));
  await copy('category_spec_templates',  () => local.category_spec_templates.findMany(), r => railway.category_spec_templates.createMany({ data: r, skipDuplicates: true }));
  await copy('products',                 () => local.product.findMany(),                 r => railway.product.createMany({ data: r, skipDuplicates: true }));
  await copy('product_translations',     () => local.productTranslation.findMany(),      r => railway.productTranslation.createMany({ data: r, skipDuplicates: true }));
  await copy('product_attachments',      () => local.productAttachment.findMany(),       r => railway.productAttachment.createMany({ data: r, skipDuplicates: true }));
  await copy('product_specifications',   () => local.productSpecification.findMany(),    r => railway.productSpecification.createMany({ data: r, skipDuplicates: true }));
  await copy('product_variants',         () => local.product_variants.findMany(),        r => railway.product_variants.createMany({ data: r, skipDuplicates: true }));
  await copy('carts',                    () => local.cart.findMany(),                    r => railway.cart.createMany({ data: r, skipDuplicates: true }));
  await copy('cart_items',               () => local.cartItem.findMany(),                r => railway.cartItem.createMany({ data: r, skipDuplicates: true }));
  await copy('orders',                   () => local.order.findMany(),                   r => railway.order.createMany({ data: r, skipDuplicates: true }));
  await copy('order_items',              () => local.orderItem.findMany(),               r => railway.orderItem.createMany({ data: r, skipDuplicates: true }));
  await copy('payments',                 () => local.payment.findMany(),                 r => railway.payment.createMany({ data: r, skipDuplicates: true }));
  await copy('quotations',               () => local.quotation.findMany(),               r => railway.quotation.createMany({ data: r, skipDuplicates: true }));
  await copy('quotation_items',          () => local.quotationItem.findMany(),           r => railway.quotationItem.createMany({ data: r, skipDuplicates: true }));
  await copy('quotation_activities',     () => local.quotationActivity.findMany(),       r => railway.quotationActivity.createMany({ data: r, skipDuplicates: true }));
  await copy('notifications',            () => local.notification.findMany(),            r => railway.notification.createMany({ data: r, skipDuplicates: true }));
  await copy('notification_preferences', () => local.notificationPreference.findMany(),  r => railway.notificationPreference.createMany({ data: r, skipDuplicates: true }));
  await copy('system_settings',          () => local.systemSettings.findMany(),          r => railway.systemSettings.createMany({ data: r, skipDuplicates: true }));
  await copy('system_config_snapshots',  () => local.systemConfigSnapshot.findMany(),    r => railway.systemConfigSnapshot.createMany({ data: r, skipDuplicates: true }));
  await copy('refresh_tokens',           () => local.refreshToken.findMany(),            r => railway.refreshToken.createMany({ data: r, skipDuplicates: true }));
  await copy('audit_logs',               () => local.auditLog.findMany(),                r => railway.auditLog.createMany({ data: r, skipDuplicates: true }));
  await copy('expenses',                 () => local.expense.findMany(),                 r => railway.expense.createMany({ data: r, skipDuplicates: true }));
  await copy('stock_history',            () => local.stock_history.findMany(),           r => railway.stock_history.createMany({ data: r, skipDuplicates: true }));

  console.log('\n✅ Migration complete! Railway DB now has all your local data.\n');
}

main()
  .catch(e => { console.error('\n❌ Migration failed:', e.message); process.exit(1); })
  .finally(async () => {
    await local.$disconnect();
    await railway.$disconnect();
  });
