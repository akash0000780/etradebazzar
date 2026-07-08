import  { Request, Response, NextFunction } from "express";
import { db } from "../db/index";
import { redis, RedisKeys } from "../db/redis";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      seller?: {
        id: string;
        status: string;
        name: string;
      };
    }
  }
}

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const sellerId = req.user?.sellerId;

  if (!sellerId) return next();

  try {
    const cached = await redis.get(RedisKeys.sellerStatus(sellerId));

    if (cached) {
      req.seller = JSON.parse(cached);
    } else {
      const seller = await db.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, status: true, name: true },
      });

      if (!seller) {
        return res.status(403).json({ error: "Seller not found" });
      }

      req.seller = seller;
      await redis.setex(RedisKeys.sellerStatus(sellerId), 300, JSON.stringify(seller));
    }

    if (req.seller?.status === "SUSPENDED") {
      return res.status(403).json({ error: "Seller account suspended" });
    }

    if (req.seller?.status !== "APPROVED") {
      return res.status(403).json({ error: "Seller account not approved" });
    }

    await db.$executeRaw`SELECT set_config('app.current_seller', ${sellerId}, true)`;

    next();
  } catch (error: any) {
    logger.error({ err: error.message }, "Tenant resolution failed");
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const setPlatformAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await db.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
  next();
};