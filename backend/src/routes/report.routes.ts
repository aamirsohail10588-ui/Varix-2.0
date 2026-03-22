import { Router } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenantIsolation.middleware";
import { ReportService } from "../services/report.service";
import { ExportFormat } from "../services/export.service";

const router = Router();

router.post("/generate", authenticateToken, requireTenant, async (req: AuthRequest, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const userId = req.user?.userId!;
        const { format } = req.body;

        const { buffer, fileName } = await ReportService.generateFinancialReport(
            tenantId,
            userId,
            (format || "PDF").toUpperCase() as ExportFormat
        );

        const contentType =
            format === "CSV" ? "text/csv" :
                format === "XLSX" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
                    "application/pdf";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.send(buffer);
    } catch (error: any) {
        console.error("[ReportRoutes] Generation Failed:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;