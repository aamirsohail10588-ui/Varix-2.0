import { Router } from "express";
import { systemController } from "./system.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

// Any authenticated user can see system health (needed for dashboard)
router.get("/worker-health", authenticateToken, systemController.getWorkerHealth);

export default router;
