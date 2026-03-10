import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { reconciliationService } from "./reconciliation.service";

export class ReconciliationController {
    async runReconciliation(req: AuthRequest, res: Response) {
        try {
            const tenantId = (req as any).tenantId;
            const result = await reconciliationService.autoMatchTransactions(tenantId);
            res.status(200).json(result);
        } catch (error: any) {
            console.error("Run Reconciliation Error:", error);
            res.status(500).json({ error: error.message || "Failed to run reconciliation" });
        }
    }

    async getUnmatched(req: AuthRequest, res: Response) {
        try {
            const tenantId = (req as any).tenantId;
            const transactions = await reconciliationService.getUnmatchedTransactions(tenantId);
            res.json(transactions);
        } catch (error: any) {
            console.error("Get Unmatched Transactions Error:", error);
            res.status(500).json({ error: error.message || "Failed to retrieve unmatched transactions" });
        }
    }

    async getSummary(req: AuthRequest, res: Response) {
        try {
            const tenantId = (req as any).tenantId;
            const summary = await reconciliationService.getReconciliationSummary(tenantId);
            res.json(summary);
        } catch (error: any) {
            console.error("Get Reconciliation Summary Error:", error);
            res.status(500).json({ error: error.message || "Failed to retrieve reconciliation summary" });
        }
    }
}

export const reconciliationController = new ReconciliationController();
