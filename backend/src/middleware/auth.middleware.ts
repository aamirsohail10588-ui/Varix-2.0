import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { config } from "../infrastructure/config";

const JWT_SECRET = config.jwtSecret;

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId?: string;
        role?: string;
    };
}

export const authenticateToken = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.sendStatus(401); // Return 401 so frontend can redirect to login
        }
        const decodedUser = decoded as { userId: string; tenantId?: string; role?: string };

        req.user = decodedUser;

        // attach tenantId directly to request for controllers
        (req as any).tenantId = decodedUser.tenantId;

        next();
    });
};
