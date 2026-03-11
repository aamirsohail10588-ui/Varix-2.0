import { Router } from 'express';
import prisma from "../infrastructure/prisma"

const router = Router();

/**
 * Health Check Endpoint
 */
router.get('/health', async (req, res) => {
    try {
        // Check DB Connection
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: 'UP',
            timestamp: new Date().toISOString(),
            services: {
                database: 'CONNECTED',
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'DOWN',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

/**
 * Basic Metrics Endpoint (Simplified Prometheus style)
 */
router.get('/metrics', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        const tenantCount = await prisma.tenant.count();
        const activeSessions = await prisma.session.count({
            where: { expiresAt: { gt: new Date() } }
        });

        res.type('text/plain');
        res.send(`
# HELP varix_users_total Total number of users
# TYPE varix_users_total counter
varix_users_total ${userCount}

# HELP varix_tenants_total Total number of tenants
# TYPE varix_tenants_total counter
varix_tenants_total ${tenantCount}

# HELP varix_active_sessions_total Current active sessions
# TYPE varix_active_sessions_total gauge
varix_active_sessions_total ${activeSessions}
    `.trim());
    } catch (error) {
        res.status(500).send('Error collecting metrics');
    }
});

export default router;
