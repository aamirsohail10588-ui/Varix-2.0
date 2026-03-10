/*
  Warnings:

  - You are about to drop the `ChangeEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `risk_scores` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[microsoftId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ChangeEvent" DROP CONSTRAINT "ChangeEvent_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeEvent" DROP CONSTRAINT "ChangeEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "risk_scores" DROP CONSTRAINT "risk_scores_tenant_id_fkey";

-- AlterTable
ALTER TABLE "CloseCycle" ADD COLUMN     "close_deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "company_size" TEXT DEFAULT 'Mid-Market',
ADD COLUMN     "industry" TEXT DEFAULT 'Technology';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "microsoftId" TEXT;

-- AlterTable
ALTER TABLE "control_results" ADD COLUMN     "confidence_score" TEXT;

-- DropTable
DROP TABLE "ChangeEvent";

-- DropTable
DROP TABLE "risk_scores";

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceMeta" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['read']::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'RECORD',
    "entity_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "snapshot_from" TEXT,
    "snapshot_to" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "journal_risk" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tax_risk" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "override_risk" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "close_risk" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_nodes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_edges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_connectors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connector_type" TEXT NOT NULL,
    "connection_config" JSONB NOT NULL,
    "sync_frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "last_sync_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_tokens" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "record_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_hierarchy" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "ownershipPct" DECIMAL(5,4) NOT NULL,

    CONSTRAINT "entity_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intercompany_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "intercompany_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elimination_journals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consolidationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elimination_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "invoiceNum" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "hsnCode" TEXT,
    "taxableValue" DECIMAL(19,4) NOT NULL,
    "igstAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gst_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_validations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issueDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_compliance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "filingStatus" TEXT NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variance_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "actual" DECIMAL(19,4) NOT NULL,
    "budget" DECIMAL(19,4) NOT NULL,
    "variance" DECIMAL(19,4) NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_health_index" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "integrity_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "close_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "control_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "change_risk_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fraud_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "evidence_component" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "final_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_health_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_metrics" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "company_size" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "average_value" DOUBLE PRECISION NOT NULL,
    "percentile_25" DOUBLE PRECISION NOT NULL,
    "percentile_50" DOUBLE PRECISION NOT NULL,
    "percentile_75" DOUBLE PRECISION NOT NULL,
    "percentile_95" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_type" TEXT NOT NULL,

    CONSTRAINT "evidence_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "service_accounts_clientId_key" ON "service_accounts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_metrics_tenant_id_period_key" ON "risk_metrics"("tenant_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "graph_nodes_tenant_id_node_type_reference_id_key" ON "graph_nodes"("tenant_id", "node_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "graph_edges_source_node_id_target_node_id_relationship_type_key" ON "graph_edges"("source_node_id", "target_node_id", "relationship_type");

-- CreateIndex
CREATE UNIQUE INDEX "erp_connectors_tenant_id_connector_type_key" ON "erp_connectors"("tenant_id", "connector_type");

-- CreateIndex
CREATE UNIQUE INDEX "entity_hierarchy_parentId_childId_key" ON "entity_hierarchy"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_health_index_tenant_id_period_key" ON "financial_health_index"("tenant_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "network_metrics_industry_company_size_metric_name_calculate_key" ON "network_metrics"("industry", "company_size", "metric_name", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_microsoftId_key" ON "User"("microsoftId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_accounts" ADD CONSTRAINT "service_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_snapshot_to_fkey" FOREIGN KEY ("snapshot_to") REFERENCES "snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_metrics" ADD CONSTRAINT "risk_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_nodes" ADD CONSTRAINT "graph_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "graph_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "graph_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_connectors" ADD CONSTRAINT "erp_connectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_tokens" ADD CONSTRAINT "connector_tokens_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "erp_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "erp_connectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_hierarchy" ADD CONSTRAINT "entity_hierarchy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_hierarchy" ADD CONSTRAINT "entity_hierarchy_childId_fkey" FOREIGN KEY ("childId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intercompany_transactions" ADD CONSTRAINT "intercompany_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elimination_journals" ADD CONSTRAINT "elimination_journals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_records" ADD CONSTRAINT "gst_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_validations" ADD CONSTRAINT "gst_validations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_compliance" ADD CONSTRAINT "vendor_compliance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_versions" ADD CONSTRAINT "forecast_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_records" ADD CONSTRAINT "variance_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_health_index" ADD CONSTRAINT "financial_health_index_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
