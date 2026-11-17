-- Short verification codes for family invites (stored as a hash, with a wrong-attempt counter).
-- Existing invites keep working through their join link: they simply have no code.
-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "codeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codeHash" TEXT;

-- CreateIndex
CREATE INDEX "Invite_email_status_idx" ON "Invite"("email", "status");

