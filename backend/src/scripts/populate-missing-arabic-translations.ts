/**
 * Populate Missing Arabic Translations
 * This script finds all products without Arabic translations and auto-translates them.
 * 
 * Run: npx tsx src/scripts/populate-missing-arabic-translations.ts
 */

import { prisma } from '@/config/database';
import { translate } from '@vitalets/google-translate-api';

/** Translate a string to Arabic. Returns the original text if translation fails. */
async function toArabic(text: string): Promise<string> {
  if (!text) return text;
  try {
    const { text: translated } = await translate(text, { to: 'ar' });
    return translated || text;
  } catch (err) {
    console.error(`  ⚠️  Translation failed for "${text}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    return text;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ Populate Missing Arabic Translations    ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Find all products
    const allProducts = await prisma.product.findMany({
      include: { translations: true }
    });

    console.log(`📊 Total products found: ${allProducts.length}\n`);

    let created = 0;
    let skipped = 0;

    for (const product of allProducts) {
      const arabicTranslation = product.translations.find((t) => t.locale === 'ar');

      if (arabicTranslation) {
        skipped++;
        continue;
      }

      // Find English translation to use as source for auto-translation
      const englishTranslation = product.translations.find((t) => t.locale === 'en');

      if (!englishTranslation) {
        console.log(`⏭️  Product ${product.id}: No English translation found, skipping`);
        skipped++;
        continue;
      }

      console.log(`\n🔄 Product: ${englishTranslation.name} (SKU: ${product.sku || 'N/A'})`);
      console.log(`   Translating English → Arabic...`);

      // Auto-translate the name and description
      const translatedName = await toArabic(englishTranslation.name);
      const translatedDescription = englishTranslation.description
        ? await toArabic(englishTranslation.description)
        : '';

      // Create the Arabic translation
      try {
        await prisma.productTranslation.create({
          data: {
            productId: product.id,
            locale: 'ar',
            name: translatedName,
            description: translatedDescription,
          },
        });

        console.log(`   ✅ Arabic translation created`);
        console.log(`      EN: "${englishTranslation.name}"`);
        console.log(`      AR: "${translatedName}"`);
        created++;
      } catch (err) {
        console.error(`   ❌ Failed to create translation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Add a small delay to avoid rate limiting on Google Translate API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    Migration Complete ✅                ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Created: ${String(created).padEnd(30)} ║`);
    console.log(`║  Skipped: ${String(skipped).padEnd(30)} ║`);
    console.log(`║  Total:   ${String(allProducts.length).padEnd(30)} ║`);
    console.log('╚════════════════════════════════════════╝\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
