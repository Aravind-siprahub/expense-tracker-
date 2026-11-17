-- Saved payment methods: cards and bank accounts that a family member can save and pick on an expense.
--
-- Adds the SavedPaymentMethod table, a nullable Expense.paymentMethodId link and the database-level
-- rules that Prisma cannot express (partial unique index, CHECK constraints, ownership foreign key).
-- Existing expenses are untouched: their paymentMethodId stays NULL, so everything keeps working.

-- Drift repair: the live database had ON DELETE CASCADE here although the schema says RESTRICT.
ALTER TABLE "FamilyMember" DROP CONSTRAINT IF EXISTS "FamilyMember_userId_fkey";
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK', 'UPI');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CREDIT', 'DEBIT');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentMethodId" TEXT;

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "nickname" TEXT,
    "cardType" "CardType",
    "lastFour" VARCHAR(4),
    "accountNumberEnc" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_userId_type_idx" ON "SavedPaymentMethod"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPaymentMethod_id_userId_key" ON "SavedPaymentMethod"("id", "userId");

-- CreateIndex
CREATE INDEX "Expense_paymentMethodId_idx" ON "Expense"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "SavedPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Rules enforced by the database itself ───────────────────────────────────────────────────────

-- At most one default per user and type among live (not deleted) methods.
CREATE UNIQUE INDEX "SavedPaymentMethod_one_default_per_type"
  ON "SavedPaymentMethod" ("userId", "type")
  WHERE "isDefault" AND "deletedAt" IS NULL;

-- A card needs a nickname, a card type and its last 4 digits, and never an account number.
-- A bank account needs its last 4 digits and an encrypted account number (wiped once deleted).
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_shape_check" CHECK (
  ("type" = 'CARD'
     AND "nickname" IS NOT NULL
     AND "cardType" IS NOT NULL
     AND "lastFour" IS NOT NULL AND "lastFour" ~ '^[0-9]{4}$'
     AND "accountNumberEnc" IS NULL)
  OR
  ("type" = 'BANK'
     AND "cardType" IS NULL
     AND "lastFour" IS NOT NULL AND "lastFour" ~ '^[0-9]{4}$'
     AND ("accountNumberEnc" IS NOT NULL OR "deletedAt" IS NOT NULL))
  OR
  ("type" = 'UPI'
     AND "cardType" IS NULL
     AND "accountNumberEnc" IS NULL)
);

-- A deleted method can never stay the default.
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_default_not_deleted_check"
  CHECK (NOT ("isDefault" AND "deletedAt" IS NOT NULL));

-- Only card and bank-transfer expenses may link to a saved method.
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_kind_check"
  CHECK ("paymentMethodId" IS NULL OR "paymentMethod" IN ('CARD', 'BANK_TRANSFER'));

-- Ownership: an expense may only use a saved method owned by the same user who made the expense.
-- (MATCH SIMPLE: not checked while paymentMethodId is NULL, so old expenses are unaffected.)
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethod_owner_fkey"
  FOREIGN KEY ("paymentMethodId", "userId") REFERENCES "SavedPaymentMethod" ("id", "userId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
