/**
 * One-time migration: fix quotations where customerName was incorrectly set
 * to the customer's email address instead of their full name.
 *
 * Run: npx tsx -r tsconfig-paths/register src/scripts/fix-quotation-customer-names.ts
 * Dry run: npx tsx -r tsconfig-paths/register src/scripts/fix-quotation-customer-names.ts --dry-run
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔧 Fix quotation customer names — ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Find all quotations where customerName looks like an email (contains '@')
  const rows = await prisma.quotation.findMany({
    where: { customerName: { contains: '@' } },
    select: { id: true, quotationNumber: true, customerName: true, customerEmail: true },
  });

  if (rows.length === 0) {
    console.log('✅ No quotations need fixing.\n');
    return;
  }

  console.log(`Found ${rows.length} quotation(s) with email used as customer name.\n`);

  let updated = 0;
  let skipped = 0;

  for (const q of rows) {
    // Look up the user profile by email
    const user = await prisma.user.findFirst({
      where: { email: { equals: q.customerEmail, mode: 'insensitive' } },
      select: { profile: { select: { fullName: true } } },
    });

    const fullName = user?.profile?.fullName?.trim();

    if (!fullName) {
      console.log(`  ⚠  ${q.quotationNumber}  email=${q.customerEmail}  → no profile name found, skipping`);
      skipped++;
      continue;
    }

    console.log(`  ✏  ${q.quotationNumber}  "${q.customerName}" → "${fullName}"`);

    if (!isDryRun) {
      await prisma.quotation.update({
        where: { id: q.id },
        data: { customerName: fullName },
      });
    }

    updated++;
  }

  console.log(`\n${isDryRun ? '[DRY RUN] Would update' : 'Updated'}: ${updated}  |  Skipped: ${skipped}\n`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
