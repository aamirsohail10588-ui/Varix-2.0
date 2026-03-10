-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "confidence_score" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "ingestion_batch_id" TEXT,
ADD COLUMN     "raw_record_id" TEXT,
ADD COLUMN     "source_id" TEXT;

-- CreateTable
CREATE TABLE "materialized_ledger_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "debit_total" DECIMAL(19,4) NOT NULL,
    "credit_total" DECIMAL(19,4) NOT NULL,
    "record_count" INTEGER NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materialized_ledger_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materialized_ledger_metrics_tenant_id_metric_date_key" ON "materialized_ledger_metrics"("tenant_id", "metric_date");

-- AddForeignKey
ALTER TABLE "materialized_ledger_metrics" ADD CONSTRAINT "materialized_ledger_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
