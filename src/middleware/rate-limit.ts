import { Request, Response, NextFunction } from "express";
import { redis } from "../db/redis";
import { logger } from "../utils/logger";

// KEYS[1] = key, ARGV[1] = window secs, ARGV[2] = max
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])

local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, window)
end

local ttl = redis.call('TTL', key)
return {count, ttl}
`;

interface RateLimitOptions {
    windowSecs: number;
    max: number;
    keyPrefix: string;
    keyExtractor?: (req: Request) => string | null;
}

interface RateLimitConfig {
    windowSecs: number;
    max: number;
}

function getConfig(key: string, defaults: RateLimitConfig): RateLimitConfig {
    return {
        windowSecs: Number(process.env[`RATE_LIMIT_${key}_WINDOW`] ?? defaults.windowSecs),
        max: Number(process.env[`RATE_LIMIT_${key}_MAX`] ?? defaults.max),
    };
}

function createRateLimiter(opts: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const identifier = opts.keyExtractor?.(req) ?? getIp(req);
            const key = `rl:${opts.keyPrefix}:${identifier}`;

            const result = await redis.eval(
                SLIDING_WINDOW_SCRIPT,
                1,
                key,
                String(opts.windowSecs),
                String(opts.max),
            ) as [number, number];

            const count = result[0]!;
            const ttl = result[1]!;

            res.setHeader("X-RateLimit-Limit", opts.max);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - count));
            res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + ttl);

            if (count > opts.max) {
                res.setHeader("Retry-After", ttl);
                logger.warn({ key, count, limit: opts.max }, "Rate limit exceeded");
                return res.status(429).json({
                    success: false,
                    error: "Too many requests - please try again later",
                    retryAfter: ttl,
                });
            }

            next();
        } catch (err: any) {
            // Redis down - fail open, never block legitimate traffic
            logger.error({ err: err.message }, "Rate limiter Redis error - failing open");
            next();
        }
    };
}

function getIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
        return first?.trim() ?? req.ip ?? "unknown";
    }
    return req.ip ?? "unknown";
}

function getSellerOrIp(req: Request): string {
    return req.seller?.id ?? req.user?.id ?? getIp(req);
}

export const authLimiter = createRateLimiter({
    ...getConfig("AUTH", { windowSecs: 60, max: 10 }),
    keyPrefix: "auth",
    keyExtractor: (req) => getIp(req),
});

export const sellerLimiter = createRateLimiter({
    ...getConfig("SELLER", { windowSecs: 60, max: 300 }),
    keyPrefix: "seller",
    keyExtractor: (req) => getSellerOrIp(req),
});

export const uploadLimiter = createRateLimiter({
    ...getConfig("UPLOAD", { windowSecs: 60, max: 20 }),
    keyPrefix: "upload",
    keyExtractor: (req) => getSellerOrIp(req),
});

export const publicLimiter = createRateLimiter({
    ...getConfig("PUBLIC", { windowSecs: 60, max: 100 }),
    keyPrefix: "public",
    keyExtractor: (req) => getIp(req),
});

export const paymentLimiter = createRateLimiter({
    ...getConfig("PAYMENT", { windowSecs: 60, max: 30 }),
    keyPrefix: "payment",
    keyExtractor: (req) => getIp(req),
});

export const otpLimiter = createRateLimiter({
    ...getConfig("OTP", { windowSecs: 300, max: 5 }),
    keyPrefix: "otp",
    keyExtractor: (req) => getIp(req),
});