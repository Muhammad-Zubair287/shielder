/**
 * One-time / idempotent SuperAdmin email update.
 *
 * Changes ONLY `users.email` for the single existing SUPER_ADMIN account.
 * Does NOT create, delete, or reset passwords. Does NOT modify passwordHash
 * or any other auth/security fields.
 *
 * Target email: sales@abraj-ataqa.com
 *
 * Run (from backend/):
 *   npm run update:superadmin-email
 *   npx tsx src/scripts/update-superadmin-email.ts
 *
 * Safety cases:
 *   A — exactly one active SuperAdmin, target email free → update email only
 *   B — target email already belongs to that SuperAdmin → no-op
 *   C — target email belongs to another user → abort
 *   D — no SuperAdmin → abort (does not create)
 *   E — multiple SuperAdmins → abort (manual review)
 *
 * Never prints password hashes, passwords, tokens, OTPs, or secrets.
 */

import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_EMAIL = 'sales@abraj-ataqa.com';

class ScriptAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptAbortError';
  }
}

type SafeUserView = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  deletedAt: Date | null;
  emailVerified: boolean;
};

function isActiveSuperAdmin(user: SafeUserView): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN &&
    user.isActive === true &&
    user.deletedAt === null &&
    user.status === UserStatus.ACTIVE
  );
}

function printUserLine(label: string, user: SafeUserView): void {
  console.log(
    `   ${label}: id=${user.id} | email=${user.email} | role=${user.role} | status=${user.status} | active=${user.isActive} | softDeleted=${user.deletedAt !== null}`
  );
}

async function main(): Promise<void> {
  const targetEmail = TARGET_EMAIL.trim().toLowerCase();

  console.log('============================================================');
  console.log('SuperAdmin email update (email-only, password unchanged)');
  console.log(`Target email: ${targetEmail}`);
  console.log('============================================================\n');

  // ── Phase 1: inspect current state (read-only) ─────────────────────────
  const allSuperAdmins = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isActive: true,
      deletedAt: true,
      emailVerified: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeSuperAdmins = allSuperAdmins.filter(isActiveSuperAdmin);

  const targetOwner = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isActive: true,
      deletedAt: true,
      emailVerified: true,
    },
  });

  console.log('── Before update ──');
  console.log(`SuperAdmin found: ${allSuperAdmins.length > 0 ? 'YES' : 'NO'}`);
  console.log(`SuperAdmin count (role=SUPER_ADMIN): ${allSuperAdmins.length}`);
  console.log(`Active SuperAdmin count: ${activeSuperAdmins.length}`);
  console.log(`Target email already exists: ${targetOwner ? 'YES' : 'NO'}`);

  if (allSuperAdmins.length > 0) {
    console.log('\nExisting SUPER_ADMIN account(s):');
    for (const sa of allSuperAdmins) {
      printUserLine('•', sa);
    }
  }

  if (targetOwner) {
    console.log('\nTarget email currently owned by:');
    printUserLine('•', targetOwner);
  }

  // CASE D
  if (allSuperAdmins.length === 0) {
    throw new ScriptAbortError(
      'CASE D: No SuperAdmin exists. Aborting — will not create a SuperAdmin.'
    );
  }

  // CASE E
  if (allSuperAdmins.length > 1) {
    console.error('\n❌ Multiple SUPER_ADMIN accounts found:');
    for (const sa of allSuperAdmins) {
      printUserLine('•', sa);
    }
    throw new ScriptAbortError(
      'CASE E: Multiple SuperAdmins exist. Aborting — manual review required. No accounts were updated.'
    );
  }

  const superAdmin = allSuperAdmins[0];

  // CASE B
  if (targetOwner && targetOwner.id === superAdmin.id) {
    console.log('\n✅ CASE B: Target email is already configured on the SuperAdmin.');
    console.log('No changes made.');
    await printAfterVerification(superAdmin.id, null);
    return;
  }

  // CASE C
  if (targetOwner && targetOwner.id !== superAdmin.id) {
    console.error('\n❌ Target email belongs to a different user:');
    printUserLine('•', targetOwner);
    throw new ScriptAbortError(
      'CASE C: Target email belongs to another user. Aborting — will not overwrite, delete, or reassign that account.'
    );
  }

  // Require the single SuperAdmin to be usable (CASE A precondition)
  if (!isActiveSuperAdmin(superAdmin)) {
    throw new ScriptAbortError(
      `CASE A precondition failed: the single SuperAdmin is not active/usable (status=${superAdmin.status}, isActive=${superAdmin.isActive}, softDeleted=${superAdmin.deletedAt !== null}). Aborting — no changes made.`
    );
  }

  // ── Phase 2: CASE A — transactional email-only update ──────────────────
  console.log('\n── Applying CASE A: update SuperAdmin email only ──');
  console.log(`   From: ${superAdmin.email}`);
  console.log(`   To:   ${targetEmail}`);

  const result = await prisma.$transaction(async (tx) => {
    // Re-check SuperAdmin set inside the transaction
    const lockedSuperAdmins = await tx.user.findMany({
      where: { role: UserRole.SUPER_ADMIN },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        deletedAt: true,
        emailVerified: true,
        passwordHash: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (lockedSuperAdmins.length !== 1) {
      throw new ScriptAbortError(
        `Transaction aborted: expected exactly 1 SUPER_ADMIN, found ${lockedSuperAdmins.length}.`
      );
    }

    const current = lockedSuperAdmins[0];

    if (current.id !== superAdmin.id) {
      throw new ScriptAbortError(
        'Transaction aborted: SuperAdmin identity changed between inspection and update.'
      );
    }

    if (!isActiveSuperAdmin(current)) {
      throw new ScriptAbortError(
        'Transaction aborted: SuperAdmin is no longer active/usable.'
      );
    }

    // Re-check target email immediately before update
    const emailConflict = await tx.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, role: true },
    });

    if (emailConflict && emailConflict.id === current.id) {
      return { updated: false, reason: 'already_configured' as const, beforeHash: current.passwordHash, userId: current.id };
    }

    if (emailConflict && emailConflict.id !== current.id) {
      throw new ScriptAbortError(
        `Transaction aborted: target email is now owned by another user (${emailConflict.email}, role=${emailConflict.role}).`
      );
    }

    const beforeHash = current.passwordHash;
    const beforeRole = current.role;

    // Email-only update — do not touch passwordHash or any other fields
    const updated = await tx.user.update({
      where: { id: current.id },
      data: { email: targetEmail },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        deletedAt: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    if (updated.passwordHash !== beforeHash) {
      throw new ScriptAbortError(
        'CRITICAL: passwordHash changed unexpectedly. Aborting transaction.'
      );
    }

    if (updated.role !== beforeRole || updated.role !== UserRole.SUPER_ADMIN) {
      throw new ScriptAbortError(
        'CRITICAL: role changed unexpectedly. Aborting transaction.'
      );
    }

    return {
      updated: true,
      reason: 'email_updated' as const,
      beforeHash,
      beforeEmail: current.email,
      userId: updated.id,
      after: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        isActive: updated.isActive,
        deletedAt: updated.deletedAt,
        emailVerified: updated.emailVerified,
        passwordHash: updated.passwordHash,
      },
    };
  });

  if (result.reason === 'already_configured') {
    console.log('\n✅ Target email already configured (detected inside transaction). No changes made.');
    await printAfterVerification(result.userId, result.beforeHash);
    return;
  }

  console.log('\n✅ Email updated successfully.');
  console.log(`   Old email: ${result.beforeEmail}`);
  console.log(`   New email: ${result.after!.email}`);

  await printAfterVerification(result.userId, result.beforeHash);
}

async function printAfterVerification(
  superAdminId: string,
  expectedPasswordHash: string | null
): Promise<void> {
  console.log('\n── After update / verification ──');

  const allSuperAdmins = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isActive: true,
      deletedAt: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  const targetEmail = TARGET_EMAIL.trim().toLowerCase();
  const byEmail = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isActive: true,
      deletedAt: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  const subject =
    allSuperAdmins.find((u) => u.id === superAdminId) ??
    byEmail ??
    null;

  console.log(`Exactly one SuperAdmin: ${allSuperAdmins.length === 1 ? 'YES' : `NO (count=${allSuperAdmins.length})`}`);
  console.log(`Email is ${targetEmail}: ${subject?.email === targetEmail ? 'YES' : 'NO'}`);
  console.log(`Role is SUPER_ADMIN: ${subject?.role === UserRole.SUPER_ADMIN ? 'YES' : 'NO'}`);
  console.log(
    `Account active (ACTIVE + isActive + not soft-deleted): ${
      subject && isActiveSuperAdmin(subject) ? 'YES' : 'NO'
    }`
  );

  if (expectedPasswordHash !== null && subject) {
    console.log(
      `Password hash unchanged: ${subject.passwordHash === expectedPasswordHash ? 'YES' : 'NO'}`
    );
  } else if (subject) {
    console.log(`Password hash present: ${subject.passwordHash ? 'YES' : 'NO'} (value not printed)`);
  }

  // Duplicate email check: unique constraint should prevent this; still report lookup
  const duplicateCheck = await prisma.user.count({
    where: { email: targetEmail },
  });
  console.log(`No duplicate email rows for target: ${duplicateCheck === 1 ? 'YES' : `NO (count=${duplicateCheck})`}`);

  if (subject) {
    printUserLine('Verified SuperAdmin', {
      id: subject.id,
      email: subject.email,
      role: subject.role,
      status: subject.status,
      isActive: subject.isActive,
      deletedAt: subject.deletedAt,
      emailVerified: subject.emailVerified,
    });
  }

  console.log('\n── Authentication note ──');
  console.log('Login with the NEW email and the EXISTING password via the normal app login flow.');
  console.log('Do not bypass OTP / trusted-device / session / RBAC checks.');
  console.log(`Email to use: ${targetEmail}`);
  console.log('Password: unchanged (existing SuperAdmin password).');
}

main()
  .catch((e) => {
    if (e instanceof ScriptAbortError) {
      console.error(`\n❌ ${e.message}`);
    } else {
      console.error('\n❌ Error updating SuperAdmin email:', e instanceof Error ? e.message : e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
