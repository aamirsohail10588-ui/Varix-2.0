import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireTenant } from "../../middleware/tenantIsolation.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { cacheMiddleware } from "../../middleware/cache.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireTenant);

router.get("/risk-vectors", cacheMiddleware(30), analyticsController.getRiskVectors);
router.post("/calculate-risk/:period", analyticsController.calculateRisk);
router.get("/summary", requirePermission("view:reports"), analyticsController.getDashboardSummary);
router.get("/integrity", requirePermission("view:reports"), analyticsController.getIntegrityScore);
router.get("/financial-health", requirePermission("view:reports"), analyticsController.getFinancialHealth);
router.get("/benchmarks", requirePermission("view:reports"), analyticsController.getBenchmarks);
router.get("/financial-state/:nodeId", analyticsController.getFinancialState);

export default router;
