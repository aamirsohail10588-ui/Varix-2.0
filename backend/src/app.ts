import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import authRoutes from "./modules/auth/auth.routes";
import ingestionRoutes from "./modules/ingestion/ingestion.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import governanceRoutes from "./modules/governance/governance.routes";
import accountingRoutes from "./modules/accounting/accounting.routes";
import bankRoutes from "./modules/bank/bank.routes";
import reconciliationRoutes from "./modules/reconciliation/reconciliation.routes";
import systemRoutes from "./modules/system/system.routes";

import tenantRoutes from "./routes/tenant_v2.routes";
import demoRoutes from './routes/demo.routes';
import changesRoutes from './routes/changes.routes';
import graphRoutes from './routes/graph.routes';
import reportRoutes from "./routes/report.routes";

import prisma from "./infrastructure/prisma";
import { analyticsService } from "./modules/analytics/analytics.service";
import { startCronJobs } from './jobs/cron';
import { startNormalizationWorker } from './workers/normalization.worker';

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
});

app.use("/api", limiter);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Domain Modules
app.use("/api/auth", authRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/system", systemRoutes);

// Legacy/Supporting Routes (To be modularized)
app.use("/api/tenants", tenantRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/changes', changesRoutes);
app.use('/api/graph', graphRoutes);
app.use("/api/reports", reportRoutes);

// Background Services
if (process.env.NODE_ENV !== 'test') {
    startCronJobs();

    // Initial Benchmark Generation
    setTimeout(() => {
        analyticsService.generateNetworkBenchmarks().catch(console.error);
    }, 5000);

    // Nightly Global Tasks
    cron.schedule("0 0 * * *", async () => {
        console.log("[CRON] Executing nightly global maintenance...");

        const date = new Date();
        const period = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;

        try {
            await analyticsService.generateNetworkBenchmarks();

            const tenants = await prisma.tenant.findMany();
            for (const t of tenants) {
                await analyticsService.calculatePeriodRisk(t.id, period).catch(() => null);
            }
            console.log("[CRON] Maintenance completed successfully.");
        } catch (e) {
            console.error("[CRON] Maintenance failed:", e);
        }
    });

    require("./jobs/cron"); // ERP Sync Worker
}

app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "VARIX API is running" });
});

app.use((err: any, req: any, res: any, next: any) => {
    console.error("GLOBAL ERROR:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
});

export default app;