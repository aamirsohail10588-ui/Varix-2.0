import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

/**
 * Global Rate Limiting
 */
export const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

/**
 * Ingestion Rate Limiting (Stricter)
 */
export const ingestionRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 ingestion requests per hour
    message: { error: 'Ingestion quota exceeded for this hour.' }
});

/**
 * Payload Integrity Verification (SHA256)
 * Compares X-Payload-Hash header with computed hash
 */
export const verifyPayloadIntegrity = (req: Request, res: Response, next: NextFunction) => {
    const clientHash = req.headers['x-payload-hash'];
    if (!clientHash) {
        return res.status(400).json({ error: 'Missing X-Payload-Hash header' });
    }

    const computedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (computedHash !== clientHash) {
        return res.status(400).json({ error: 'Payload integrity check failed: Hash mismatch' });
    }

    next();
};

/**
 * TLS Enforcement & Secure Headers (WAF Compatible)
 */
export const secureHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Ensure payload size is within limits (e.g., 10MB for ingestion)
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'Payload too large. Max 10MB allowed.' });
    }

    next();
};
