import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

export const config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.DATABASE_URL as string,
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    nodeEnv: process.env.NODE_ENV || "development",
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPort: parseInt(process.env.REDIS_PORT || "6379"),
    redisUrl: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || "6379"}`,
};
