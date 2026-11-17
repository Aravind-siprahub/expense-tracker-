/**
 * Adds realistic SAMPLE data to an existing family, for demos and for seeing the screens filled in:
 * custom categories, about three months of expenses, income and budgets for the new categories.
 *
 *   corepack yarn workspace @repo/db seed:sample you@example.com
 *   corepack yarn workspace @repo/db seed:sample you@example.com --force   (run again)
 *
 * The email must belong to a user who is already in a family. Nothing existing is changed or
 * deleted: categories, income and budgets that already exist are skipped. Amounts are in paise.
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch {
  /* dotenv not available: DATABASE_URL must already be in the environment */
}
const { PrismaClient } = require('@prisma/client');

const email = (process.argv[2] || '').trim().toLowerCase();
const force = process.argv.includes('--force');
if (!email.includes('@')) {
  console.error('Usage: seed:sample <email of a user who is in a family> [--force]');
  process.exit(1);
}

const prisma = new PrismaClient();
const rupees = (n) => Math.round(n * 100);
const pad = (n) => String(n).padStart(2, '0');
const ym = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;

// Small deterministic random so the sample data is the same every run.
let seed = 20261117;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) / 10) * 10;

const CUSTOM_CATEGORIES = ['Pet Care', 'Gym & Fitness', 'Gifts & Donations', 'Subscriptions', 'Home Maintenance'];
const CUSTOM_BUDGETS = { 'Pet Care': 3000, 'Gym & Fitness': 2000, 'Gifts & Donations': 2500, Subscriptions: 1500, 'Home Maintenance': 2000 };

// [category, note, rupees (number or [min, max]), payment method, day(s) of month, who: 'a' admin | 'm' member | 'x' either]
const MONTHLY = [
  ['Rent & Housing', 'House rent', 18000, 'CARD', [1], 'a'],
  ['EMI & Loans', 'Car loan EMI', 9500, 'BANK_TRANSFER', [10], 'a'],
  ['Education', 'School fees', 6000, 'BANK_TRANSFER', [4], 'a'],
  ['Education', 'Tuition', 2500, 'UPI', [8], 'm'],
  ['Electricity & Bills', 'Electricity bill', [2300, 3600], 'UPI', [5], 'a'],
  ['Electricity & Bills', 'Mobile and internet', 1299, 'UPI', [6], 'm'],
  ['Groceries', 'Monthly provisions', [4200, 5200], 'UPI', [3], 'm'],
  ['Groceries', 'Vegetables and fruit', [550, 1250], 'UPI', [9, 16, 23, 29], 'x'],
  ['Food & Dining', 'Dinner out', [900, 2200], 'CARD', [7, 21], 'a'],
  ['Food & Dining', 'Cafe', [320, 640], 'UPI', [12, 26], 'm'],
  ['Transport & Fuel', 'Petrol', [1400, 1800], 'CASH', [4, 18], 'a'],
  ['Transport & Fuel', 'Auto and cab', [180, 480], 'UPI', [11, 24], 'm'],
  ['Medical & Healthcare', 'Pharmacy', [420, 1150], 'CASH', [14], 'x'],
  ['Entertainment', 'Movie tickets', [700, 1100], 'UPI', [15], 'x'],
  ['Entertainment', 'OTT subscription', 649, 'CARD', [2], 'm'],
  ['Shopping', 'Clothes', [2200, 4600], 'CARD', [19], 'm'],
  ['Shopping', 'Household items', [800, 1700], 'UPI', [13], 'a'],
  ['Personal Expenses', 'Salon', [500, 900], 'CASH', [17], 'm'],
  ['Pet Care', 'Dog food', [1100, 1500], 'UPI', [5], 'a'],
  ['Pet Care', 'Vet visit', [700, 1400], 'CARD', [20], 'x'],
  ['Gym & Fitness', 'Gym membership', 1500, 'UPI', [7], 'a'],
  ['Subscriptions', 'Music and cloud storage', 399, 'CARD', [3], 'm'],
  ['Home Maintenance', 'Plumber and repairs', [500, 1600], 'CASH', [22], 'a'],
  ['Gifts & Donations', 'Temple donation', 501, 'CASH', [1], 'x'],
];
// One-off items: [month offset (0 = this month, -1 = last), category, note, rupees, method, day, who]
const ONE_OFFS = [
  [-1, 'Travel', 'Weekend trip to Pondicherry', 6500, 'CARD', 20, 'a'],
  [-1, 'Insurance', 'Health insurance premium', 3200, 'BANK_TRANSFER', 12, 'a'],
  [-1, 'Gifts & Donations', 'Birthday gift', 1800, 'CARD', 9, 'm'],
  [-2, 'Travel', 'Train tickets to Chennai', 2400, 'UPI', 15, 'm'],
  [-2, 'Medical & Healthcare', 'Dental checkup', 1800, 'CARD', 18, 'a'],
  [0, 'Gifts & Donations', 'Wedding gift', 2100, 'CARD', 8, 'a'],
  [0, 'Medical & Healthcare', 'Doctor consultation', 800, 'UPI', 11, 'm'],
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);
  const me = await prisma.familyMember.findFirst({ where: { userId: user.id, active: true } });
  if (!me) throw new Error(`${email} is not in a family yet. Create or join one first.`);
  const familyId = me.familyId;
  const family = await prisma.family.findUniqueOrThrow({ where: { id: familyId } });
  const others = await prisma.familyMember.findMany({ where: { familyId, active: true, userId: { not: user.id } }, orderBy: { joinedAt: 'asc' } });
  const adminId = user.id;
  const memberId = others[0]?.userId ?? user.id; // with only one member, everything is theirs
  console.log(`Adding sample data to "${family.name}" for ${email}` + (others[0] ? ` (second member present)` : ` (only one member)`));

  const already = await prisma.category.findFirst({ where: { familyId, name: CUSTOM_CATEGORIES[0] } });
  if (already && !force) {
    console.log('This family already has the sample categories, so the script stopped to avoid duplicates. Use --force to add more anyway.');
    return;
  }

  // 1. Custom categories
  const cats = Object.fromEntries((await prisma.category.findMany({ where: { OR: [{ familyId: null }, { familyId }] } })).map((c) => [c.name, c.id]));
  let newCats = 0;
  for (const name of CUSTOM_CATEGORIES) {
    if (cats[name]) continue;
    cats[name] = (await prisma.category.create({ data: { familyId, name } })).id;
    newCats++;
  }

  // 2. Expenses for the current month (up to today) and the two before it
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const rows = [];
  const add = (offset, category, note, amount, method, day, who) => {
    const y = now.getFullYear();
    const mIndex = now.getMonth() + offset;
    const date = new Date(Date.UTC(y, mIndex, Math.min(day, new Date(Date.UTC(y, mIndex + 1, 0)).getUTCDate())));
    if (date.getTime() > today) return; // never in the future
    if (!cats[category]) throw new Error(`Unknown category: ${category}`);
    const who2 = who === 'a' ? adminId : who === 'm' ? memberId : rows.length % 2 ? memberId : adminId;
    rows.push({
      familyId,
      userId: who2,
      categoryId: cats[category],
      amountPaise: rupees(Array.isArray(amount) ? between(amount[0], amount[1]) : amount),
      date,
      paymentMethod: method,
      note,
    });
  };
  for (const offset of [-2, -1, 0]) {
    for (const [category, note, amount, method, days, who] of MONTHLY) {
      for (const day of days) add(offset, category, note, amount, method, day, who);
    }
  }
  for (const [offset, ...rest] of ONE_OFFS) add(offset, ...rest);
  await prisma.expense.createMany({ data: rows });

  // 3. Income: a salary for each of the three months, plus some freelance, unless already recorded
  let newIncome = 0;
  for (const offset of [-2, -1, 0]) {
    const month = ym(new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1)));
    const wanted = [
      { userId: adminId, type: 'SALARY', amountPaise: rupees(75000), note: null },
      ...(others[0] ? [{ userId: memberId, type: 'SALARY', amountPaise: rupees(30000), note: null }] : []),
      ...(offset === -1 ? [{ userId: memberId, type: 'OTHER', amountPaise: rupees(8000), note: 'Freelance project' }] : []),
    ];
    for (const w of wanted) {
      const exists = await prisma.income.findFirst({ where: { familyId, month, userId: w.userId, type: w.type } });
      if (exists) continue;
      await prisma.income.create({ data: { ...w, familyId, month, createdById: adminId } });
      newIncome++;
    }
  }

  // 4. Budgets for the new custom categories this month (existing budgets are left alone)
  const month = ym(now);
  let newBudgets = 0;
  for (const [name, amount] of Object.entries(CUSTOM_BUDGETS)) {
    const exists = await prisma.budget.findFirst({ where: { familyId, month, categoryId: cats[name] } });
    if (exists) continue;
    await prisma.budget.create({ data: { familyId, month, categoryId: cats[name], amountPaise: rupees(amount) } });
    newBudgets++;
  }

  console.log(`Done: ${newCats} custom categories, ${rows.length} expenses, ${newIncome} income entries, ${newBudgets} budgets added.`);
}

main()
  .catch((e) => {
    console.error('Failed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
