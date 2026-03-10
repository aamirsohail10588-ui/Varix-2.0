import { Request, Response } from "express";
import { accountingService } from "./accounting.service";
import { ExportService, ExportFormat } from "../../services/export.service";

export class AccountingController {
    async getEntries(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = ((req as any).tenantId || req.headers["x-tenant-id"]) as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const data = await accountingService.getLedgerEntries(tenantId, page, limit);
            return res.json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getSummary(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = ((req as any).tenantId || req.headers["x-tenant-id"]) as string;
            const summary = await accountingService.getLedgerSummary(tenantId);
            return res.json(summary);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    async exportLedger(req: Request, res: Response): Promise<any> {
        try {
            const tenantId = ((req as any).tenantId || req.headers["x-tenant-id"]) as string;
            const format = (req.query.format as string || "CSV").toUpperCase() as ExportFormat;

            const { data: entries } = await accountingService.getLedgerEntries(tenantId, 1, 1000);

            const headers = ["ID", "Account", "Amount", "Currency", "Date", "Description", "Confidence"];
            const data = entries.map((e: any) => [
                e.id,
                e.account.name,
                e.debit_amount.toString(),
                e.currency,
                new Date(e.transaction_date).toLocaleDateString(),
                "Canonical Ledger Record",
                e.confidence_score
            ]);

            const buffer = await ExportService.generateExport({
                title: "General Ledger Export",
                headers,
                data,
                format
            });

            const contentType = format === "CSV" ? "text/csv" : format === "XLSX" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename=VARIX_Ledger_Export.${format.toLowerCase()}`);
            return res.send(buffer);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}

export const accountingController = new AccountingController();
