import { Router } from "express";
import { accountingController } from "./accounting.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireTenant);

router.get("/", requirePermission("view:ledger"), accountingController.getEntries);
router.get("/summary", requirePermission("view:ledger"), accountingController.getSummary);
router.get("/export", requirePermission("export:ledger"), accountingController.exportLedger);

export default router;
