import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { translate } from '@vitalets/google-translate-api';

const prisma = new PrismaClient();

const localeMatches = (translationLocale?: string | null, requestedLocale?: string | null) => {
  if (!translationLocale || !requestedLocale) return false;
  const a = String(translationLocale).toLowerCase();
  const b = String(requestedLocale).toLowerCase();
  return a === b || a.startsWith(b) || b.startsWith(a);
};

async function toArabic(text: string): Promise<string> {
  if (!text) return text;
  try {
    const { text: translated } = await translate(text, { to: 'ar' });
    return translated || text;
  } catch {
    return text;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const products = await prisma.product.findMany({
    include: { translations: true },
    orderBy: { createdAt: 'asc' },
  });

  const targets = products.filter((product) => {
    const en = product.translations.find((translation) => localeMatches(translation.locale, 'en'));
    const ar = product.translations.find((translation) => localeMatches(translation.locale, 'ar'));
    if (!en) return false;
    return !ar || !ar.name || !ar.description;
  });

  const report: Array<{
    id: string;
    sku: string | null;
    action: 'created' | 'updated';
    arabicName: string;
    arabicDescription?: string;
  }> = [];

  for (const product of targets) {
    const english = product.translations.find((translation) => localeMatches(translation.locale, 'en'))!;
    const existingArabic = product.translations.find((translation) => localeMatches(translation.locale, 'ar'));
    const arabicName = existingArabic?.name?.trim() || (await toArabic(english.name));
    const arabicDescription = existingArabic?.description?.trim() || (english.description ? await toArabic(english.description) : undefined);

    if (!dryRun) {
      await prisma.productTranslation.upsert({
        where: {
          productId_locale: {
            productId: product.id,
            locale: 'ar',
          },
        },
        create: {
          productId: product.id,
          locale: 'ar',
          name: arabicName,
          description: arabicDescription,
        },
        update: {
          name: arabicName,
          description: arabicDescription,
        },
      });
    }

    report.push({
      id: product.id,
      sku: product.sku,
      action: existingArabic ? 'updated' : 'created',
      arabicName,
      arabicDescription,
    });
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'applied',
    totalProducts: products.length,
    targets: targets.length,
    sample: report.slice(0, 20),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to backfill product Arabic translations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
