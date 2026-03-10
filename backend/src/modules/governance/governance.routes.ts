import { Router } from "express";
import { governanceController } from "./governance.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireTenant);

// Closing Cycles
router.get("/cycles/current", requirePermission("view:close_cycles"), governanceController.getCurrentCycle);
router.post("/cycles/start", requirePermission("manage:close_cycles"), governanceController.startCycle);

// Controls & Violations
router.get("/violations", requirePermission("view:reports"), governanceController.getViolations);
router.get("/violations/export", requirePermission("view:reports"), governanceController.exportViolations);

// Snapshots
router.get("/snapshots", requirePermission("view:reports"), governanceController.getSnapshots);

// Task Actions
router.post("/tasks/:taskId/approve", requirePermission("approve:close_tasks"), governanceController.approveTask);

export default router;
