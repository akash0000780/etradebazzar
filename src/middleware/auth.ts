import { Request, Response, NextFunction } from "express";
import { jwtService } from "../utils/jwt";

import { logger } from "../utils/logger";

import { db } from "../db/index";
import { redis, RedisKeys } from "../db/redis";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        sellerId?: string;
        [key: string]: any;
      };
      sessionId?: string;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = auth.split(" ")[1];

  try {
    const payload = jwtService.verifyToken(token as string);

    if (!payload.sub) throw new Error("Token missing user ID");

    if (payload.jti) {
      const blacklisted = await redis.get(RedisKeys.tokenBlacklist(payload.jti));
      if (blacklisted) {
        return res.status(401).json({ error: "Token revoked", code: "TOKEN_REVOKED" });
      }
    }

    const user = await db.user.findUnique({ where: { id: payload.sub } });

    if (!user) throw new Error("User no longer exists");
    if (!user.isActive) throw new Error("User account disabled");

    const member = await db.sellerMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { sellerId: true },
    });

    const platformMember = await db.platformMember.findFirst({
      where: { userId: user.id },
      include: { role: true },
    });

    // Determine role: platform role takes precedence, then seller, then user
    let role = "user";
    if (platformMember?.role?.name) {
      role = platformMember.role.name;
    } else if (member?.sellerId) {
      role = "seller";
    }

    req.user = {
      ...user,
      sellerId: member?.sellerId,
      role,
    };
    next();
  } catch (error: any) {
    logger.warn({ ip: req.ip, userAgent: req.get("User-Agent") }, "Auth failed: " + error.message);
    if (error.message === "Token expired") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token", code: "TOKEN_INVALID" });
  }
};

export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role || "user")) {
      return res.status(403).json({ error: "Forbidden. Insufficient role." });
    }

    next();
  };
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = jwtService.refreshToken(oldRefreshToken);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  } catch (error: any) {
    logger.warn(
      { ip: req.ip, userAgent: req.get("User-Agent") },
      "Refresh token failed: " + error.message
    );

    return res.status(401).json({ error: "Invalid refresh token" });
  }
};
