# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VARIX 2.0 is an enterprise financial governance platform with a separate backend (Express 5 + Prisma + PostgreSQL) and frontend (Next.js 16 + React 19). Multi-tenant SaaS architecture with row-level security.

## Commands

### Backend (`cd backend`)
- **Dev server**: `npm run dev` (tsx watch, port 5000)
- **Build**: `npm run build` (tsc → dist/)
- **Type check**: `npx tsc --noEmit`
- **Tests**: `npm test` / `npm run test:watch` / `npm run test:coverage`
- **Workers**: `npm run workers` (starts background processors separately)
- **Prisma**: `npx prisma generate` / `npx prisma migrate dev` / `npx prisma db push`

### Frontend (`cd frontend`)
- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Architecture

### Backend Structure

```
backend/src/
├── app.ts                    # Express app: middleware stack + route mounting
├── server.ts                 # Entry point: startup maintenance, cleanup workers
├── infrastructure/           # prisma client, redis, config, queue (BullMQ)
├── middleware/               # auth → tenantIsolation → rbac → cache → security
├── modules/                  # Domain modules (route + controller + service pattern)
│   ├── auth/                 # JWT auth, MFA (otplib), API keys, service accounts
│   ├── ingestion/            # CSV/Excel upload, connector CRUD, batch orchestration
│   ├── governance/           # Controls, compliance, integrity, lineage, conditioning
│   ├── analytics/            # FHI scoring, benchmarking, risk vectors, FSG
│   ├── accounting/           # Period locks, closing cycles
│   ├── bank/                 # Bank statement management
│   ├── reconciliation/       # Multi-way reconciliation engine
│   ├── tax/                  # Tax calculations, GST, jurisdiction management
│   ├── intelligence/         # Anomaly detection, variance, budget, predictive
│   ├── ledger/               # Consolidation, GAAP
│   ├── orchestration/        # Job scheduling (SchedulerService)
│   └── system/               # Monitoring, health
├── pipelines/                # csvIngestion.pipeline.ts (extreme-scale ingestion)
├── workers/                  # normalization, ingestion, cleanup, orchestration, snapshotGraph
├── services/                 # Shared services (audit, sync, planning, report, etc.)
├── routes/                   # Legacy routes (demo, tenants, changes, graph, reports)
└── jobs/                     # Cron job definitions
```

### Ingestion Pipeline (critical path)

The CSV pipeline (`pipelines/csvIngestion.pipeline.ts`) handles extreme-scale data:

1. **Upload** → IngestionBatch created (status: RECEIVED)
2. **Staging** → Unlogged PostgreSQL temp table via `COPY` command
3. **Account resolution** → Maps account codes to IDs, creates UNMAPPED fallback
4. **Partition auto-creation** → Creates yearly partitions on `ledger_entries`
5. **Bulk insert** → Drops indexes, inserts with ORDER BY, rebuilds indexes in parallel
6. **Snapshot** → Links batch to Snapshot for downstream processing

The normalization worker (`workers/normalization.worker.ts`) polls for UNPROCESSED snapshots every 5s, processes RawRecords in 10K-row chunks, and writes LedgerEntries.

### Multi-Tenancy (3 layers)

1. **HTTP**: `x-tenant-id` header on every request
2. **JWT**: `tenantId` claim embedded in access token
3. **Database**: PostgreSQL RLS via `SET app.current_tenant` in transaction context

The middleware chain is: `authenticateToken` → `requireTenant` (validates user-tenant mapping with Redis cache, TTL 600s) → `requirePermission` (RBAC check).

### Frontend Structure

```
frontend/src/
├── app/                  # Next.js App Router pages
├── components/           # Reusable components (shadcn/ui + Radix)
├── state/                # SystemStateProvider (Context API, 30s auto-refresh)
├── services/             # API client (axios) + domain service classes
├── context/              # Additional React context providers
└── lib/                  # Utilities, formatters
```

**State management**: `SystemStateProvider` calls `Promise.allSettled` across all API endpoints every 30s. Components consume via `useSystemState()` hook.

**API client** (`services/apiClient.ts`): Axios instance with interceptors that attach Bearer token + `x-tenant-id` from localStorage. 401 responses redirect to `/login`.

### Prisma Schema Conventions

The schema mixes camelCase and snake_case field names. Some models use `@map()` for table names but fields retain their Prisma-side names. Key patterns:

- **LedgerEntry**: All snake_case (`tenant_id`, `transaction_date`, `debit_amount`). Composite PK: `[id, transaction_date]` for partitioning.
- **IngestionBatch/Snapshot/SyncJob/SyncLog**: snake_case fields (`tenant_id`, `created_at`, `started_at`)
- **Account/CloseCycle/ControlSpec/Budget/Entity**: camelCase fields (`tenantId`, `createdAt`)
- **Financial amounts**: Always `Decimal(19,4)`, never Float

When writing Prisma queries, match the exact field names in the schema. Do not assume camelCase or snake_case — check the model definition.

### Background Processing

- **BullMQ** queues (`ingestion`, `orchestration`) backed by Redis
- **5 workers**: normalization (polls DB), ingestion (BullMQ), cleanup, orchestration, snapshotGraph
- **Cron** (node-cron in app.ts): Nightly benchmark generation + per-tenant risk calculation

## Code Modification Rules (from AGENT_RULES.md)

- Never modify existing working logic unless explicitly requested
- Never rename variables, functions, or imports unless required
- Never delete existing code without instruction
- Only edit the exact section requested; do not refactor entire files
- Do not change API routes or database schema unless instructed
- Prefer additive changes over modifying existing structures
- Before completing any modification: verify imports, verify TypeScript types, verify build compiles (`npx tsc --noEmit`)

## Key Gotchas

- **Express 5**: `req.params` values are `string | string[]` — always use `String(req.params.x)` when passing to Prisma
- **Backend port**: `.env` says 5000, `server.ts` fallback says 4000 — always check `.env`
- **No shared code**: Backend and frontend are fully separate; they share only the API contract
- **Partitioned tables**: `ledger_entries` is range-partitioned by `transaction_date` year — raw SQL touching this table must account for partitions
- **Audit logs are hash-chained**: `AuditLog.hash` + `prevHash` form an integrity chain
