import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { bankService } from "./bank.service";

export class BankController {
    async uploadStatement(req: AuthRequest, res: Response) {
        try {
            const { bankAccountId, statementDate, transactions } = req.body;
            const tenantId = (req as any).tenantId;

            if (!bankAccountId || !transactions || !Array.isArray(transactions)) {
                return res.status(400).json({ error: "Missing bankAccountId or transactions array" });
            }

            const result = await bankService.uploadStatement(tenantId, bankAccountId, statementDate ? new Date(statementDate) : new Date(), transactions);
            res.status(201).json(result);
        } catch (error: any) {
            console.error("Upload Statement Error:", error);
            res.status(500).json({ error: error.message || "Failed to upload statement" });
        }
    }

    async getStatements(req: AuthRequest, res: Response) {
        try {
            const tenantId = (req as any).tenantId;
            const statements = await bankService.getStatements(tenantId);
            res.json(statements);
        } catch (error: any) {
            console.error("Get Statements Error:", error);
            res.status(500).json({ error: error.message || "Failed to retrieve statements" });
        }
    }
}

export const bankController = new BankController();
