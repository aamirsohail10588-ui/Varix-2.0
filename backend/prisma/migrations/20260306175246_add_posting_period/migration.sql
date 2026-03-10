-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "posting_period" TEXT NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_posting_period_idx" ON "ledger_entries"("tenant_id", "posting_period");
