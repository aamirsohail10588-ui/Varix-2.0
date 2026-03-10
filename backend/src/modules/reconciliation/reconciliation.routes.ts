import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";
import { reconciliationController } from "./reconciliation.controller";

const router = Router();

router.post("/run", authenticateToken, requireTenant, reconciliationController.runReconciliation);
router.get("/unmatched", authenticateToken, requireTenant, reconciliationController.getUnmatched);
router.get("/summary", authenticateToken, requireTenant, reconciliationController.getSummary);

export default router;
