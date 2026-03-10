-- SQL Migration: Convert ledger_entries to Time-Partitioned Table

-- 1. Rename existing table
ALTER TABLE ledger_entries RENAME TO ledger_entries_old;

-- 2. Create partitioned parent table matching the schema exactly
-- Note: Primary Key must include the partition key (transaction_date)
CREATE TABLE ledger_entries (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    transaction_date TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL,
    posting_period TEXT NOT NULL DEFAULT 'OPEN',
    account_id TEXT NOT NULL,
    debit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0,
    credit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'USD',
    source_system TEXT,
    snapshot_id TEXT,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confidence_score INTEGER NOT NULL DEFAULT 100,
    ingestion_batch_id TEXT,
    raw_record_id TEXT,
    source_id TEXT,
    PRIMARY KEY (id, transaction_date)
) PARTITION BY RANGE (transaction_date);

-- 3. Create monthly partitions for 2026
-- We include a broad range for 2025 as well just in case
CREATE TABLE ledger_entries_2025_all PARTITION OF ledger_entries FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE ledger_entries_2026_01 PARTITION OF ledger_entries FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE ledger_entries_2026_02 PARTITION OF ledger_entries FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE ledger_entries_2026_03 PARTITION OF ledger_entries FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE ledger_entries_2026_04 PARTITION OF ledger_entries FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 4. Create default partition for data outside ranges (Safety net)
CREATE TABLE ledger_entries_default PARTITION OF ledger_entries DEFAULT;

-- 5. Migrate existing data
INSERT INTO ledger_entries (
    id, tenant_id, transaction_date, posting_period, account_id, 
    debit_amount, credit_amount, currency, source_system, 
    snapshot_id, "createdAt", confidence_score, 
    ingestion_batch_id, raw_record_id, source_id
)
SELECT 
    id, tenant_id, transaction_date, posting_period, account_id, 
    debit_amount, credit_amount, currency, source_system, 
    snapshot_id, "createdAt", confidence_score, 
    ingestion_batch_id, raw_record_id, source_id
FROM ledger_entries_old;

-- 6. Recreate indexes on the parent table (these will automatically be created on partitions)
CREATE INDEX "ledger_entries_tenant_id_idx" ON ledger_entries (tenant_id);
CREATE INDEX "ledger_entries_transaction_date_idx" ON ledger_entries (transaction_date);
CREATE INDEX "ledger_entries_account_id_idx" ON ledger_entries (account_id);
CREATE INDEX "ledger_entries_snapshot_id_idx" ON ledger_entries (snapshot_id);
CREATE INDEX "ledger_entries_ingestion_batch_id_idx" ON ledger_entries (ingestion_batch_id);

-- 7. Add foreign key constraints (PostgreSQL 11+ supports FKs on partitioned tables pointing to other tables)
ALTER TABLE ledger_entries ADD CONSTRAINT "ledger_entries_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ledger_entries ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY (account_id) REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 8. Automated function to create next month's partition
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE) + interval '1 month';
  end_date := start_date + interval '1 month';
  partition_name := 'ledger_entries_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF ledger_entries
     FOR VALUES FROM (%L) TO (%L)',
     partition_name,
     start_date,
     end_date
  );
END;
$$ LANGUAGE plpgsql;
