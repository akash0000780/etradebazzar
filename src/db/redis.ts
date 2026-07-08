import Redis from "ioredis";
import { logger } from "../utils/logger";
import { config } from "../../config/config";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  enableReadyCheck: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err: err.message }, "Redis error"));

export const RedisKeys = {
  tokenBlacklist: (jti: string) => `blacklist:${jti}`,
  sellerStatus: (sellerId: string) => `seller:status:${sellerId}`,
  userRoles: (userId: string, sellerId: string) => `rbac:${userId}:${sellerId}`,
  userPermissions: (userId: string, sellerId: string) => `perms:${userId}:${sellerId}`,
} as const;