-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_idx" ON "ledger_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_transaction_date_idx" ON "ledger_entries"("tenant_id", "transaction_date");

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_idx" ON "ledger_entries"("account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_snapshot_id_idx" ON "ledger_entries"("snapshot_id");

-- CreateIndex
CREATE INDEX "ledger_entries_ingestion_batch_id_idx" ON "ledger_entries"("ingestion_batch_id");
