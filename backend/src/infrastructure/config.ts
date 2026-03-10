import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || "varix_super_secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    nodeEnv: process.env.NODE_ENV || "development",
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPort: parseInt(process.env.REDIS_PORT || "6379"),
};
