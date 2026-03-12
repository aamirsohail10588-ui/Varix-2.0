import prisma from "./src/infrastructure/prisma";

async function main() {
    console.log("Verifying Orchestration Tables...");

    // Check if table exists
    const tables: any[] = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('workflow_runs', 'workflow_tasks', 'workflow_task_dependencies', 'job_definitions')
    `;

    console.log("Existing tables:", tables.map(t => t.table_name));

    if (tables.length < 4) {
        console.log("Some tables missing. Re-applying SQL...");
        // Re-apply SQL with double quotes for safety
        const sqls = [
            `CREATE TABLE IF NOT EXISTS "workflow_runs" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id"),
                "workflow_name" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "error_message" TEXT,
                "metadata" JSONB,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS "workflow_tasks" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "run_id" UUID NOT NULL REFERENCES "workflow_runs"("id") ON DELETE CASCADE,
                "task_name" TEXT NOT NULL,
                "task_type" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "started_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "retry_count" INT DEFAULT 0,
                "max_retries" INT DEFAULT 3,
                "error_message" TEXT,
                "input_data" JSONB,
                "output_data" JSONB
            )`,
            `CREATE TABLE IF NOT EXISTS "workflow_task_dependencies" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "predecessorId" UUID NOT NULL REFERENCES "workflow_tasks"("id"),
                "successorId" UUID NOT NULL REFERENCES "workflow_tasks"("id"),
                UNIQUE("predecessorId", "successorId")
            )`,
            `CREATE TABLE IF NOT EXISTS "job_definitions" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id"),
                "name" TEXT NOT NULL,
                "workflow_name" TEXT NOT NULL,
                "cron_schedule" TEXT NOT NULL,
                "last_run_at" TIMESTAMP WITH TIME ZONE,
                "next_run_at" TIMESTAMP WITH TIME ZONE,
                "is_active" BOOLEAN DEFAULT true,
                "config" JSONB,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`
        ];

        for (const sql of sqls) {
            console.log("Executing SQL...");
            await prisma.$executeRawUnsafe(sql);
        }
    }

    console.log("Verification Complete.");
    process.exit(0);
}

main();
