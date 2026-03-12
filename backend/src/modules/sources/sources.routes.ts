/**
 * ROUTES: Sources Management & Health
 * PATH: src/modules/sources/sources.routes.ts
 */

import { Router } from "express";
import { HealthService } from "./health.service";
import { authenticateToken } from "../../middleware/auth.middleware";
import { enforceTenant } from "../../middleware/tenant.middleware";

const router = Router();

/**
 * GET /api/sources/health
 * Get reliability and health metrics for all connectors
 */
router.get("/health", authenticateToken, enforceTenant, async (req: any, res) => {
    try {
        const tenantId = req.tenantId;
        const health = await HealthService.getTenantSourceHealth(tenantId);
        res.json(health);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sources/reliability/:id
 * Get detailed reliability score for a specific connector
 */
router.get("/reliability/:id", authenticateToken, enforceTenant, async (req: any, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const connectors = await HealthService.getTenantSourceHealth(tenantId);
        const connector = connectors.find(c => c.connectorId === id);

        if (!connector) {
            return res.status(404).json({ error: "Connector not found" });
        }

        res.json({
            connectorId: id,
            reliability_score: connector.reliability_score,
            status: connector.status
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
