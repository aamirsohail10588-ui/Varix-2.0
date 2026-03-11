import { Router } from "express";
import prisma from "../infrastructure/prisma";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenantIsolation.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireTenant);

// Get recent change events strictly matching limits
router.get("/recent", async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const limit = parseInt(req.query.limit || "50", 10);

        const changes = await prisma.changeEvent.findMany({
            where: { tenant_id: tenantId },
            orderBy: { detected_at: "desc" },
            take: limit
        });

        const labelMap: Record<string, string> = {
            "RECORD_CREATED": "Invoice Created",
            "RECORD_MODIFIED": "Invoice Updated",
            "PERIOD_EDIT": "Journal Modified",
            "BACKDATED_ENTRY": "Ledger Adjustment Posted",
            "RECORD_DELETED": "Record Removed"
        };

        const labeledChanges = changes.map(c => ({
            ...c,
            display_label: labelMap[c.change_type] || c.change_type
        }));

        res.json({ success: true, data: labeledChanges });
    } catch (error: any) {
        console.error("Error fetching recent changes:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get aggregate summary for the frontend natively
router.get("/summary", async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;

        const changes = await prisma.changeEvent.groupBy({
            by: ["change_type"],
            where: { tenant_id: tenantId },
            _count: { _all: true }
        });

        const summary: Record<string, number> = {
            RECORD_CREATED: 0,
            RECORD_MODIFIED: 0,
            RECORD_DELETED: 0,
            BACKDATED_ENTRY: 0
        };

        changes.forEach((c: any) => {
            summary[c.change_type] = c._count._all;
        });

        res.json({ success: true, data: summary });
    } catch (error: any) {
        console.error("Error fetching change summary:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get("/export", async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;
        const format = (req.query.format as string || "CSV").toUpperCase() as any;

        const changes = await prisma.changeEvent.findMany({
            where: { tenant_id: tenantId },
            orderBy: { detected_at: "desc" }
        });

        const headers = ["ID", "Type", "Entity", "Detected At", "Snapshot"];
        const data = changes.map(c => [
            c.id,
            c.change_type,
            c.entity_type,
            new Date(c.detected_at).toLocaleDateString(),
            c.snapshot_to
        ]);

        const { ExportService } = require("../services/export.service");
        const buffer = await ExportService.generateExport({
            title: "Financial Changes Export",
            headers,
            data,
            format
        });

        const contentType = format === "CSV" ? "text/csv" : format === "XLSX" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename=VARIX_Changes_Export.${format.toLowerCase()}`);
        res.send(buffer);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
