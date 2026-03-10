import { Response, NextFunction } from "express";

const cacheMap = new Map<string, { data: any, expiry: number }>();

export const cacheMiddleware = (ttlSeconds: number) => {
    return (req: any, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `${req.originalUrl || req.url}-${req.tenantId || 'no-tenant'}`;
        const cached = cacheMap.get(key);

        if (cached && cached.expiry > Date.now()) {
            console.log(`[Cache] Hit for ${key}`);
            return res.json(cached.data);
        }

        // Intercept res.json to store in cache
        const originalJson = res.json;
        res.json = function (data: any): Response {
            if (res.statusCode === 200) {
                cacheMap.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000) });
            }
            return originalJson.call(this, data);
        };

        next();
    };
};
