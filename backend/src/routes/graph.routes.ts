import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenantIsolation.middleware";

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireTenant);

// Get visual topological risk patterns
router.get("/risk-patterns", async (req: any, res: any) => {
    try {
        const tenantId = req.tenantId;

        // E.g., Find Vendors tied to numerous INVOICES that triggered CONTROL_VIOLATIONS
        const vendors = await prisma.graphNode.findMany({
            where: { tenant_id: tenantId, node_type: "VENDOR" },
            include: {
                edges_in: {
                    include: {
                        sourceNode: {
                            include: {
                                edges_in: {
                                    include: { sourceNode: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const riskSignals = vendors.map((v: any) => {
            let violations = 0;
            v.edges_in.forEach((edge: any) => {
                if (edge.sourceNode.node_type === "INVOICE") {
                    edge.sourceNode.edges_in.forEach((invEdge: any) => {
                        if (invEdge.sourceNode.node_type === "CONTROL_VIOLATION" || invEdge.relationship_type === "VIOLATED_CONTROL") {
                            violations++;
                        }
                    });
                }
            });
            return {
                vendor_id: v.reference_id,
                violation_count: violations
            };
        }).filter((v: any) => v.violation_count > 0)
            .sort((a: any, b: any) => b.violation_count - a.violation_count);

        return res.json({
            success: true,
            high_risk_vendors: riskSignals
        });

    } catch (error: any) {
        console.error("Error fetching graphic risk patterns:", error);
        res.status(500).json({ error: "Failed to generate visual graph boundaries natively." });
    }
});

export default router;
