/**
 * Permanently deletes one user and records that directly belong to them.
 * Requires the email twice to make accidental deletion harder:
 *
 *   corepack yarn workspace @repo/db user:delete user@example.com --confirm=user@example.com
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch {
  /* dotenv not available: DATABASE_URL must already be in the environment */
}
const { PrismaClient } = require('@prisma/client');

const email = (process.argv[2] || '').trim().toLowerCase();
const confirmation = (
  process.argv.find((arg) => arg.startsWith('--confirm=')) || ''
)
  .slice('--confirm='.length)
  .trim()
  .toLowerCase();

if (!email.includes('@') || confirmation !== email) {
  console.error('Usage: user:delete <email> --confirm=<same email>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);

  const deleted = await prisma.$transaction(async (tx) => {
    const expenses = await tx.expense.deleteMany({
      where: { userId: user.id },
    });
    const income = await tx.income.deleteMany({ where: { userId: user.id } });
    const incomeAuthorship = await tx.income.updateMany({
      where: { createdById: user.id },
      data: { createdById: null },
    });
    const paymentMethods = await tx.savedPaymentMethod.deleteMany({
      where: { userId: user.id },
    });
    const memberships = await tx.familyMember.deleteMany({
      where: { userId: user.id },
    });
    const passwordResets = await tx.passwordReset.deleteMany({
      where: { userId: user.id },
    });
    const invites = await tx.invite.deleteMany({
      where: { invitedById: user.id },
    });
    await tx.user.delete({ where: { id: user.id } });

    return {
      expenses: expenses.count,
      income: income.count,
      incomeAuthorshipCleared: incomeAuthorship.count,
      paymentMethods: paymentMethods.count,
      memberships: memberships.count,
      passwordResets: passwordResets.count,
      invites: invites.count,
    };
  });

  console.log(`Permanently deleted ${user.email} (${user.name}).`);
  console.log(JSON.stringify(deleted, null, 2));
}

main()
  .catch((error) => {
    console.error(
      'Deletion failed; the transaction was rolled back:',
      error.message
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
