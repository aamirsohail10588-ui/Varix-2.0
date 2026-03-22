import fs from "fs";
import prisma from "../infrastructure/prisma";
import { spawn } from "child_process";
import { ingestionService } from "../modules/ingestion/ingestion.service";

export class CsvIngestionPipeline {

    async processExtremeScale(filePath: string, tenantId: string, batchId: string) {
        console.log(`[Pipeline] Starting ingestion for batch ${batchId}`);

        try {
            // Create snapshot so normalization worker can process later
            const snapshot = await prisma.snapshot.create({
                data: {
                    tenant_id: tenantId,
                    batch_id: batchId,
                    status: "UNPROCESSED",
                    snapshot_timestamp: new Date(),
                }
            });

            await ingestionService.transitionState(batchId, "VALIDATING");

            const rawDbUrl = process.env.DATABASE_URL!;
            const dbUrlObj = new URL(rawDbUrl);
            dbUrlObj.search = "";
            const dbUrl = dbUrlObj.toString();

            const sanitizedBatchId = batchId.replace(/-/g, "");
            const stagingTable = `staging_${sanitizedBatchId}`;

            const rawHeaders = await this.sniffCsvHeaders(filePath);
            // Strict sanitization: alphanumeric and underscores only
            const headers = rawHeaders.map(h => h.replace(/[^a-zA-Z0-9_]/g, "_"));
            const columns = headers.map((h) => `"${h}" TEXT`).join(", ");

            await prisma.$executeRawUnsafe(`CREATE UNLOGGED TABLE ${stagingTable} (${columns})`);

            const copyCmd = `psql "${dbUrl}" -c "\\copy ${stagingTable}(${headers.map((h) => `"${h}"`).join(",")}) FROM '${filePath.replace(/\\/g, "/")}' WITH (FORMAT csv, HEADER true)"`;
            await this.runShellCommand(copyCmd);

            await ingestionService.transitionState(batchId, "STAGED");

            await prisma.$executeRaw`SET LOCAL synchronous_commit = OFF`;

            // --- FAST PATH NORMALIZATION START ---
            // 1. Identify key columns
            const findCol = (keys: string[]) => headers.find(h => keys.some(k => h.toLowerCase().includes(k.toLowerCase())));

            const dateCol = findCol(['date', 'timestamp']) || headers[0];
            const accountCol = findCol(['account', 'code', 'ledger']) || headers[1] || headers[0];
            const debitCol = findCol(['debit', 'dr']) || headers[2] || headers[0];
            const creditCol = findCol(['credit', 'cr']) || headers[3] || headers[0];

            // 2. Get Unmapped Account ID
            const unmappedAccount = await prisma.account.findFirst({
                where: { tenantId, code: "UNMAPPED" }
            }) || await prisma.account.create({
                data: { tenantId, code: "UNMAPPED", name: "Unmapped Ingestions", type: "ASSET" }
            });

            // --- PARTITION AUTO-CREATION START ---
            // --- PARTITION AUTO-CREATION (OPTIMIZED) ---
            // Instead of scanning the whole table, we ensure partitions for the current, previous, and next year exists.
            // This covers almost all financial use cases and saves a full table scan.
            const currentYear = new Date().getFullYear();
            const yearsToEnsure = [currentYear - 1, currentYear, currentYear + 1];

            for (const year of yearsToEnsure) {
                const partitionName = `ledger_entries_y${year}`;
                const startDate = `${year}-01-01`;
                const endDate = `${year + 1}-01-01`;

                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS ${partitionName} 
                    PARTITION OF ledger_entries 
                    FOR VALUES FROM ('${startDate}') TO ('${endDate}')
                `);
            }

            console.log(`[Pipeline] Optimizing normalization for ${snapshot.id}...`);

            // 3. Enterprise Index-Bypass Normalization SQL (Phase 5)
            // - Step 1: Resolve all IDs and format data into an unlogged intermediate table.
            // - Step 2: Drop non-primary indexes on target partitions to eliminate write overhead.
            // - Step 3: Clustered insertion into partitions.
            // - Step 4: Parallel index reconstruction.

            // We'll use a dynamic SQL approach to handle index preservation.
            // For simplicity in this shell-based pipeline, we'll implement the index logic inside the SQL script.
            const normSql = `
                SET max_parallel_workers_per_gather = 16;
                SET work_mem = '512MB';
                SET maintenance_work_mem = '1GB';
                SET synchronous_commit = OFF;

                -- 1. Create Resolved Staging
                DROP TABLE IF EXISTS resolved_${sanitizedBatchId};
                CREATE UNLOGGED TABLE resolved_${sanitizedBatchId} AS
                WITH m AS (
                    SELECT id, UPPER(TRIM(code)) as norm_code 
                    FROM "Account" 
                    WHERE "tenantId" = :'tenant_id'
                )
                SELECT
                    gen_random_uuid() as id,
                    :'tenant_id'::uuid as tenant_id,
                    (COALESCE(NULLIF(st."${dateCol}", ''), now()::text))::timestamp as transaction_date,
                    COALESCE(m.id::uuid, :'unmapped_id'::uuid) as account_id,
                    (COALESCE(NULLIF(st."${debitCol}", ''), '0'))::numeric as debit_amount,
                    (COALESCE(NULLIF(st."${creditCol}", ''), '0'))::numeric as credit_amount,
                    :'snapshot_id'::uuid as snapshot_id,
                    :'batch_id'::uuid as ingestion_batch_id,
                    now() as "createdAt"
                FROM ${stagingTable} st
                LEFT JOIN m ON m.norm_code = UPPER(TRIM(st."${accountCol}"));

                ANALYZE resolved_${sanitizedBatchId};

                -- 2. Index Bypass Logic
                -- We detect partitions that will be affected and drop their non-primary indexes.
                DO $$
                DECLARE
                    r RECORD;
                    v_year TEXT;
                    v_part TEXT;
                BEGIN
                    FOR v_year IN SELECT DISTINCT EXTRACT(YEAR FROM transaction_date)::text FROM resolved_${sanitizedBatchId} LOOP
                        v_part := 'ledger_entries_y' || v_year;
                        
                        -- Store index definitions in a temp table for this session
                        CREATE TEMP TABLE IF NOT EXISTS preserved_indexes (def TEXT);
                        INSERT INTO preserved_indexes 
                        SELECT indexdef FROM pg_indexes 
                        WHERE tablename = v_part AND indexname NOT LIKE '%pkey%';

                        -- Drop indexes
                        FOR r IN SELECT indexname FROM pg_indexes WHERE tablename = v_part AND indexname NOT LIKE '%pkey%' LOOP
                            EXECUTE 'DROP INDEX ' || r.indexname;
                        END LOOP;
                    END LOOP;
                END $$;

                -- 3. Clustered Insert
                INSERT INTO ledger_entries (
                    id, tenant_id, transaction_date, account_id,
                    debit_amount, credit_amount,
                    snapshot_id, ingestion_batch_id, "createdAt"
                )
                SELECT * FROM resolved_${sanitizedBatchId}
                ORDER BY transaction_date
                ON CONFLICT DO NOTHING;

                -- 4. Restore Indexes
                DO $$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN SELECT def FROM preserved_indexes LOOP
                        EXECUTE r.def;
                    END LOOP;
                    DROP TABLE preserved_indexes;
                END $$;

                DROP TABLE resolved_${sanitizedBatchId};
            `;

            const sqlFilePath = `${filePath}.norm.sql`;
            fs.writeFileSync(sqlFilePath, normSql);

            try {
                const normCmd = `psql "${dbUrl}" -v ON_ERROR_STOP=1 -v tenant_id=${tenantId} -v unmapped_id=${unmappedAccount.id} -v snapshot_id=${snapshot.id} -v batch_id=${batchId} -f "${sqlFilePath}"`;
                await this.runShellCommand(normCmd);
            } finally {
                if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);
            }

            const countResult: any[] = await prisma.$queryRaw`
                SELECT COUNT(*)::int as count FROM ledger_entries WHERE snapshot_id = ${snapshot.id}::uuid
            `;
            const count = countResult[0]?.count || 0;

            await ingestionService.transitionState(batchId, "NORMALIZED");

            await prisma.$executeRawUnsafe(`DROP TABLE ${stagingTable}`);

            await ingestionService.transitionState(batchId, "COMMITTED");

            await prisma.snapshot.update({
                where: { id: snapshot.id },
                data: {
                    status: "COMPLETED",
                    record_count: Number(count)
                }
            });

            console.log(`[Pipeline] Ingestion & Normalization COMPLETE for ${count} rows.`);

            return {
                success: true,
                batchId,
                snapshotId: snapshot.id
            };

        } catch (err) {
            console.error("[Pipeline] ingestion failed:", err);
            await ingestionService.transitionState(batchId, "FAILED", { error: err instanceof Error ? err.message : String(err) });
            throw err;
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }

    private async sniffCsvHeaders(filePath: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, { start: 0, end: 10240 });
            let data = "";
            stream.on("data", (chunk) => {
                data += chunk.toString();
                const firstLine = data.split(/\r?\n/)[0];
                if (firstLine && data.includes("\n")) {
                    stream.destroy();
                    const headers = firstLine
                        .split(",")
                        .map((h) => h.trim().replace(/^"|"$/g, ""))
                        .filter((h) => h.length > 0);
                    resolve(headers);
                }
            });
            stream.on("error", reject);
            stream.on("end", () => {
                if (!data) return reject(new Error("File is empty"));
                const firstLine = data.split(/\r?\n/)[0];
                const headers = firstLine
                    .split(",")
                    .map((h) => h.trim().replace(/^"|"$/g, ""))
                    .filter((h) => h.length > 0);
                resolve(headers);
            });
        });
    }

    private runShellCommand(cmd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const shellProcess = spawn(cmd, { shell: true });

            shellProcess.stdout.on("data", (data) => {
                console.log(data.toString());
            });

            shellProcess.stderr.on("data", (data) => {
                console.error(data.toString());
            });

            shellProcess.on("close", (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Command exited with code ${code}`));
            });
        });
    }
}

export const csvIngestionPipeline = new CsvIngestionPipeline();