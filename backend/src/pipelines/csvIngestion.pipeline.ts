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
            console.log(`[Pipeline] Ensuring partitions exist for ${stagingTable}...`);
            const yearsResult: any[] = await prisma.$queryRawUnsafe(`
                SELECT DISTINCT EXTRACT(YEAR FROM (COALESCE(NULLIF("${dateCol}", ''), now()::text))::timestamp)::int as year 
                FROM ${stagingTable}
            `);

            for (const { year } of yearsResult) {
                if (!year) continue;
                const partitionName = `ledger_entries_y${year}`;
                const startDate = `${year}-01-01`;
                const endDate = `${year + 1}-01-01`;

                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS ${partitionName} 
                    PARTITION OF ledger_entries 
                    FOR VALUES FROM ('${startDate}') TO ('${endDate}')
                `);
                console.log(`[Pipeline] Verified partition ${partitionName}`);
            }

            console.log(`[Pipeline] Snapshot ${snapshot.id}: Executing Fast Path Normalization...`);

            const normSql = `
                INSERT INTO ledger_entries (
                    id, tenant_id, transaction_date, account_id,
                    debit_amount, credit_amount,
                    snapshot_id, ingestion_batch_id, "createdAt"
                )
                SELECT
                    gen_random_uuid(),
                    :'tenant_id'::uuid,
                    (COALESCE(NULLIF(st."${dateCol}", ''), now()::text))::timestamp,
                    COALESCE(a.id, :'unmapped_id'::uuid),
                    (COALESCE(NULLIF(st."${debitCol}", ''), '0'))::numeric,
                    (COALESCE(NULLIF(st."${creditCol}", ''), '0'))::numeric,
                    :'snapshot_id'::uuid,
                    :'batch_id'::uuid,
                    now()
                FROM ${stagingTable} st
                LEFT JOIN "Account" a ON a."tenantId" = :'tenant_id'::uuid
                    AND UPPER(TRIM(a.code)) = UPPER(TRIM(st."${accountCol}"))
                ON CONFLICT DO NOTHING;
            `;

            const sqlFilePath = `${filePath}.norm.sql`;
            fs.writeFileSync(sqlFilePath, normSql);

            try {
                const normCmd = `psql "${dbUrl}" -v tenant_id=${tenantId} -v unmapped_id=${unmappedAccount.id} -v snapshot_id=${snapshot.id} -v batch_id=${batchId} -f "${sqlFilePath}"`;
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