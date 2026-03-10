-- CreateIndex
CREATE INDEX "ingestion_batches_tenant_id_idx" ON "ingestion_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "ingestion_batches_status_idx" ON "ingestion_batches"("status");

-- CreateIndex
CREATE INDEX "ingestion_batches_created_at_idx" ON "ingestion_batches"("created_at");
