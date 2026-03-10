import { Router } from "express";
import { systemController } from "./system.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();

// Only site admins or authorized operators should see system health
router.get("/worker-health", authenticateToken, requirePermission("view:system"), systemController.getWorkerHealth);

export default router;
