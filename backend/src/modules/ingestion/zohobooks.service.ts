/**
 * MODULE: Zoho Books Connector Service
 * PATH: src/modules/ingestion/zohobooks.service.ts
 * VERSION: 2.1.0
 * STATUS: ACTIVE
 *
 * Responsibilities:
 * - Zoho OAuth flow (auth URL, callback, token refresh)
 * - Sync invoices, journals, contacts, taxes from Zoho Books
 * - Push raw records into ingestion pipeline
 *
 * OUT OF SCOPE:
 * - Canonical mapping → canonical.mapper.ts (to be built)
 * - Normalization → normalization.worker.ts (to be built)
 * - Batch orchestration → ingestion.service.ts
 */

import axios, { AxiosInstance } from "axios";
import prisma from "../../infrastructure/prisma";
import type { Prisma } from "@prisma/client";
import {
    ingestionService,
    type RawPayloadRow,
    type ConnectorConfig,
} from "./ingestion.service";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ZohoConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

interface ZohoTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

interface ZohoOrganization {
    organization_id: string;
    name: string;
}

interface ZohoContact {
    contact_name: string;
    contact_type: "vendor" | "customer";
}

interface ZohoTax {
    tax_name: string;
    tax_percentage: string | number;
}

interface ZohoInvoice {
    date: string;
    invoice_number: string;
    total: string | number;
    currency_code: string;
    customer_id: string;
}

interface ZohoJournal {
    journal_date: string;
    journal_number: string;
    total: string | number;
    currency_code: string;
    notes?: string;
}

export interface ZohoSyncResult {
    success: boolean;
    records_synced: number;
    timestamp: Date;
    is_demo?: boolean;
}

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const getZohoConfig = (): ZohoConfig => {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "[ZohoService] Missing required env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI"
        );
    }

    return { clientId, clientSecret, redirectUri };
};

// ─────────────────────────────────────────────
// OAUTH
// ─────────────────────────────────────────────

export const generateZohoAuthUrl = (tenantId: string): string => {
    const config = getZohoConfig();

    const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        scope: "ZohoBooks.fullaccess.all",
        redirect_uri: config.redirectUri,
        state: tenantId,
        access_type: "offline",
        prompt: "consent",
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
};

export const handleZohoCallback = async (
    code: string,
    tenantId: string,
    serverLocation = "https://accounts.zoho.com"
): Promise<{ connectorId: string }> => {
    const config = getZohoConfig();

    const tokenResponse = await axios.post<ZohoTokenResponse>(
        `${serverLocation}/oauth/v2/token`,
        null,
        {
            params: {
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                grant_type: "authorization_code",
            },
        }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!refresh_token) {
        throw new Error(
            "[ZohoService] No refresh_token returned from Zoho OAuth. Re-authentication required."
        );
    }

    const orgResponse = await axios.get<{ organizations: ZohoOrganization[] }>(
        "https://www.zohoapis.com/books/v3/organizations",
        {
            headers: { Authorization: `Zoho-oauthtoken ${access_token}` },
        }
    );

    const organizationId =
        orgResponse.data.organizations?.[0]?.organization_id;

    if (!organizationId) {
        throw new Error(
            "[ZohoService] No organization found for this Zoho account."
        );
    }

    const connectionConfig: ConnectorConfig = {
        access_token,
        refresh_token,
        token_expiry: Date.now() + expires_in * 1000,
        organization_id: organizationId,
        server_location: serverLocation,
    };

    const connector = await prisma.erpConnector.upsert({
        where: {
            tenant_id_connector_type: {
                tenant_id: tenantId,
                connector_type: "ZOHO_CONNECTOR",
            },
        },
        update: {
            connection_config: connectionConfig as Prisma.InputJsonValue,
            status: "ACTIVE",
        },
        create: {
            tenant_id: tenantId,
            connector_type: "ZOHO_CONNECTOR",
            connection_config: connectionConfig as Prisma.InputJsonValue,
            sync_frequency: "EVERY_6_HOURS",
            status: "ACTIVE",
        },
    });

    return { connectorId: connector.id };
};

// ─────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────

const refreshZohoToken = async (
    connectorId: string,
    connConfig: ConnectorConfig
): Promise<string> => {
    // 60-second buffer before expiry to avoid edge case failures
    if (
        connConfig.token_expiry &&
        Date.now() < (connConfig.token_expiry as number) - 60_000
    ) {
        return connConfig.access_token as string;
    }

    if (!connConfig.refresh_token) {
        throw new Error(
            "[ZohoService] No refresh_token available. Complete OAuth flow before syncing."
        );
    }

    const config = getZohoConfig();
    const serverLocation =
        (connConfig.server_location as string) || "https://accounts.zoho.com";

    const response = await axios.post<ZohoTokenResponse>(
        `${serverLocation}/oauth/v2/token`,
        null,
        {
            params: {
                refresh_token: connConfig.refresh_token,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: "refresh_token",
            },
        }
    );

    const { access_token, expires_in } = response.data;

    const updatedConfig: ConnectorConfig = {
        ...connConfig,
        access_token,
        token_expiry: Date.now() + expires_in * 1000,
    };

    await prisma.erpConnector.update({
        where: { id: connectorId },
        data: { connection_config: updatedConfig as Prisma.InputJsonValue },
    });

    return access_token;
};

// ─────────────────────────────────────────────
// API CLIENT FACTORY
// ─────────────────────────────────────────────

const buildZohoApiClient = (
    accessToken: string,
    organizationId: string
): AxiosInstance => {
    return axios.create({
        baseURL: "https://www.zohoapis.com/books/v3",
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        params: { organization_id: organizationId },
    });
};

// ─────────────────────────────────────────────
// SYNC — CONTACTS (bulk, no N+1)
// ─────────────────────────────────────────────

const syncContacts = async (
    apiClient: AxiosInstance,
    tenantId: string
): Promise<void> => {
    const response = await apiClient.get<{ contacts: ZohoContact[] }>(
        "/contacts"
    );
    const contacts = response.data.contacts || [];

    const vendors = contacts
        .filter((c) => c.contact_type === "vendor" && c.contact_name)
        .map((c) => ({ tenantId, name: c.contact_name }));

    const customers = contacts
        .filter((c) => c.contact_type === "customer" && c.contact_name)
        .map((c) => ({ tenantId, name: c.contact_name }));

    if (vendors.length > 0) {
        await prisma.vendor.createMany({ data: vendors, skipDuplicates: true });
    }

    if (customers.length > 0) {
        await prisma.customer.createMany({ data: customers, skipDuplicates: true });
    }

    console.log(
        `[ZohoService] Synced ${vendors.length} vendors, ${customers.length} customers.`
    );
};

// ─────────────────────────────────────────────
// SYNC — TAXES
// ─────────────────────────────────────────────

const syncTaxes = async (
    apiClient: AxiosInstance,
    tenantId: string
): Promise<void> => {
    const response = await apiClient.get<{ taxes: ZohoTax[] }>(
        "/settings/taxes"
    );
    const taxes = response.data.taxes || [];

    for (const tax of taxes) {
        if (!tax.tax_name) continue;
        const rate = tax.tax_percentage ? Number(tax.tax_percentage) / 100 : 0;

        await prisma.taxComponent.upsert({
            where: { tenantId_code: { tenantId, code: tax.tax_name } },
            update: { rate },
            create: { tenantId, code: tax.tax_name, rate },
        });
    }

    console.log(`[ZohoService] Synced ${taxes.length} tax components.`);
};

// ─────────────────────────────────────────────
// PAYLOAD BUILDERS
// NOTE: Account codes are placeholders.
// Replace with canonical.mapper.ts once built.
// ─────────────────────────────────────────────

const buildInvoicePayloads = (invoices: ZohoInvoice[]): RawPayloadRow[] => {
    const payloads: RawPayloadRow[] = [];

    for (const inv of invoices) {
        const amt = Number(inv.total);
        if (!amt || !inv.invoice_number) continue;

        payloads.push({
            transaction_date: inv.date,
            account_code: "1200",
            account_name: "Accounts Receivable",
            amount: amt.toFixed(2),
            currency: inv.currency_code,
            voucher_number: inv.invoice_number,
            vendor_id: inv.customer_id,
            invoice_number: inv.invoice_number,
            description: `Zoho Invoice ${inv.invoice_number}`,
            source_system: "ZOHO_CONNECTOR",
            debit: amt.toFixed(2),
            credit: "0",
        });

        payloads.push({
            transaction_date: inv.date,
            account_code: "4000",
            account_name: "Sales Revenue",
            amount: amt.toFixed(2),
            currency: inv.currency_code,
            voucher_number: inv.invoice_number,
            vendor_id: inv.customer_id,
            invoice_number: inv.invoice_number,
            description: `Zoho Invoice Sales ${inv.invoice_number}`,
            source_system: "ZOHO_CONNECTOR",
            debit: "0",
            credit: amt.toFixed(2),
        });
    }

    return payloads;
};

const buildJournalPayloads = (journals: ZohoJournal[]): RawPayloadRow[] => {
    const payloads: RawPayloadRow[] = [];

    for (const jnl of journals) {
        const amt = Number(jnl.total);
        if (!amt || !jnl.journal_number) continue;

        // TODO: Fetch /journals/{id} line items for proper debit/credit accounts
        // Current: balanced placeholder entries pending canonical.mapper.ts
        payloads.push({
            transaction_date: jnl.journal_date,
            account_code: "9999",
            account_name: "Manual Journal",
            amount: amt.toFixed(2),
            currency: jnl.currency_code,
            voucher_number: jnl.journal_number,
            description: jnl.notes || `Zoho Journal ${jnl.journal_number}`,
            source_system: "ZOHO_CONNECTOR",
            debit: amt.toFixed(2),
            credit: "0",
        });

        payloads.push({
            transaction_date: jnl.journal_date,
            account_code: "9999",
            account_name: "Manual Journal",
            amount: amt.toFixed(2),
            currency: jnl.currency_code,
            voucher_number: jnl.journal_number,
            description: `${jnl.notes || `Zoho Journal ${jnl.journal_number}`} (Offset)`,
            source_system: "ZOHO_CONNECTOR",
            debit: "0",
            credit: amt.toFixed(2),
        });
    }

    return payloads;
};

// ─────────────────────────────────────────────
// IDEMPOTENCY
// Uses raw SQL JSON query — Prisma Json path filter
// does not support 'string_in', raw query is correct approach
// ─────────────────────────────────────────────

const getAlreadySyncedVoucherNumbers = async (
    tenantId: string,
    voucherNumbers: string[]
): Promise<Set<string>> => {
    if (voucherNumbers.length === 0) return new Set();

    // Raw query: find raw_records linked to this tenant whose
    // payload_json->>'voucher_number' is in the provided list
    const rows = await prisma.$queryRaw<{ voucher_number: string }[]>`
    SELECT DISTINCT rr.payload_json->>'voucher_number' AS voucher_number
    FROM raw_records rr
    INNER JOIN ingestion_batches ib ON ib.id = rr.batch_id
    WHERE ib.tenant_id = ${tenantId}
      AND rr.payload_json->>'voucher_number' = ANY(${voucherNumbers}::text[])
  `;

    return new Set(rows.map((r) => r.voucher_number).filter(Boolean));
};

// ─────────────────────────────────────────────
// MAIN SYNC
// ─────────────────────────────────────────────

export const syncZohoBooks = async (
    connectorId: string,
    tenantId: string
): Promise<ZohoSyncResult> => {
    const connector = await prisma.erpConnector.findUnique({
        where: { id: connectorId },
    });

    if (!connector || connector.tenant_id !== tenantId) {
        throw new Error(
            `[ZohoService] Connector ${connectorId} not found for tenant ${tenantId}.`
        );
    }

    if (connector.status !== "ACTIVE") {
        throw new Error(
            `[ZohoService] Connector is not ACTIVE. Current status: ${connector.status}`
        );
    }

    const connConfig = connector.connection_config as ConnectorConfig;

    if (!connConfig.refresh_token) {
        throw new Error(
            "[ZohoService] Connector has no refresh_token. Complete OAuth flow before syncing."
        );
    }

    const accessToken = await refreshZohoToken(connectorId, connConfig);
    const organizationId = connConfig.organization_id as string;

    if (!organizationId) {
        throw new Error("[ZohoService] No organization_id in connector config.");
    }

    const apiClient = buildZohoApiClient(accessToken, organizationId);

    // Sync reference data — failures are logged, not thrown
    await syncContacts(apiClient, tenantId).catch((err: Error) =>
        console.error(`[ZohoService] Contact sync failed: ${err.message}`)
    );

    await syncTaxes(apiClient, tenantId).catch((err: Error) =>
        console.error(`[ZohoService] Tax sync failed: ${err.message}`)
    );

    // Fetch transactional data in parallel
    const [invoicesRes, journalsRes] = await Promise.all([
        apiClient.get<{ invoices: ZohoInvoice[] }>("/invoices"),
        apiClient.get<{ journals: ZohoJournal[] }>("/journals"),
    ]);

    const allPayloads = [
        ...buildInvoicePayloads(invoicesRes.data.invoices || []),
        ...buildJournalPayloads(journalsRes.data.journals || []),
    ];

    if (allPayloads.length === 0) {
        console.log(`[ZohoService] No records to sync for connector ${connectorId}.`);
        return { success: true, records_synced: 0, timestamp: new Date() };
    }

    // Idempotency: skip already-synced voucher numbers
    const voucherNumbers = allPayloads
        .map((p) => p.voucher_number)
        .filter((v): v is string => !!v);

    const alreadySynced = await getAlreadySyncedVoucherNumbers(
        tenantId,
        voucherNumbers
    );

    const newPayloads = allPayloads.filter(
        (p) => !p.voucher_number || !alreadySynced.has(p.voucher_number)
    );

    if (newPayloads.length === 0) {
        console.log(
            `[ZohoService] All records already synced for connector ${connectorId}.`
        );
        return { success: true, records_synced: 0, timestamp: new Date() };
    }

    // Create batch, insert records, hand off to normalization worker
    const batch = await ingestionService.createBatch(
        tenantId,
        "ZOHO_CONNECTOR",
        `zoho_sync_${Date.now()}.json`,
        newPayloads.length
    );

    await ingestionService.insertRawRecords(batch.id, newPayloads);
    await ingestionService.normalizeToLedgerEntries(tenantId, batch.id);

    await prisma.erpConnector.update({
        where: { id: connectorId },
        data: { last_sync_at: new Date() },
    });

    console.log(
        `[ZohoService] Sync complete. ${newPayloads.length} new records queued for normalization.`
    );

    return {
        success: true,
        records_synced: newPayloads.length,
        timestamp: new Date(),
    };
};