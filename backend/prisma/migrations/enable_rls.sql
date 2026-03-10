-- Enable Row Level Security and Create Policies for Multi-Tenant Tables

-- Function to handle policy creation for tables with 'tenant_id'
CREATE OR REPLACE FUNCTION create_rls_policy_snake(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON %I', table_name, table_name);
    EXECUTE format('CREATE POLICY tenant_isolation_%I ON %I USING (tenant_id = current_setting(''app.current_tenant'')::uuid)', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Function to handle policy creation for tables with 'tenantId'
CREATE OR REPLACE FUNCTION create_rls_policy_camel(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON %I', table_name, table_name);
    EXECUTE format('CREATE POLICY tenant_isolation_%I ON %I USING ("tenantId" = current_setting(''app.current_tenant'')::uuid)', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Tables with 'tenant_id' (snake_case columns)
SELECT create_rls_policy_snake('ledger_entries');
SELECT create_rls_policy_snake('ingestion_batches');
SELECT create_rls_policy_snake('snapshots');
SELECT create_rls_policy_snake('raw_records');
SELECT create_rls_policy_snake('change_events');
SELECT create_rls_policy_snake('control_runs');
SELECT create_rls_policy_snake('control_results');
SELECT create_rls_policy_snake('risk_metrics');
SELECT create_rls_policy_snake('financial_health_index');
SELECT create_rls_policy_snake('materialized_ledger_metrics');
SELECT create_rls_policy_snake('graph_nodes');
SELECT create_rls_policy_snake('graph_edges');
SELECT create_rls_policy_snake('erp_connectors');
SELECT create_rls_policy_snake('connector_tokens');
SELECT create_rls_policy_snake('sync_jobs');
SELECT create_rls_policy_snake('sync_logs');
SELECT create_rls_policy_snake('entities');
SELECT create_rls_policy_snake('intercompany_transactions');
SELECT create_rls_policy_snake('elimination_journals');
SELECT create_rls_policy_snake('gst_records');
SELECT create_rls_policy_snake('gst_validations');
SELECT create_rls_policy_snake('vendor_compliance');
SELECT create_rls_policy_snake('budgets');
SELECT create_rls_policy_snake('forecast_versions');
SELECT create_rls_policy_snake('variance_records');
SELECT create_rls_policy_snake('evidence_documents');

-- Tables with 'tenantId' (CamelCase columns)
SELECT create_rls_policy_camel('Role');
SELECT create_rls_policy_camel('UserTenantRole');
SELECT create_rls_policy_camel('Account');
SELECT create_rls_policy_camel('AuditLog');
SELECT create_rls_policy_camel('Branch');
SELECT create_rls_policy_camel('CloseCycle');
SELECT create_rls_policy_camel('CloseTask');
SELECT create_rls_policy_camel('ControlOverride');
SELECT create_rls_policy_camel('ControlSpec');
SELECT create_rls_policy_camel('CostCenter');
SELECT create_rls_policy_camel('Customer');
SELECT create_rls_policy_camel('DataQualityIssue');
SELECT create_rls_policy_camel('EntityHierarchy');
SELECT create_rls_policy_camel('EnumValue');
SELECT create_rls_policy_camel('FxRate');
SELECT create_rls_policy_camel('Permission');
SELECT create_rls_policy_camel('Session');
SELECT create_rls_policy_camel('TaxComponent');
SELECT create_rls_policy_camel('Tenant');
SELECT create_rls_policy_camel('Vendor');
SELECT create_rls_policy_camel('BankAccount');
SELECT create_rls_policy_camel('BankStatement');
SELECT create_rls_policy_camel('ReconciliationMatch');

-- Cleanup helper functions
DROP FUNCTION create_rls_policy_snake(text);
DROP FUNCTION create_rls_policy_camel(text);
