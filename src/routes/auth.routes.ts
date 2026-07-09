import { Router } from "express";
import { db } from "../db/index";
import { jwtService } from "../utils/jwt";
import { validate } from "../utils/validate";
import { z } from "zod";
import { logger } from "../utils/logger";
import { protect } from "../middleware/auth";
import { redis, RedisKeys } from "../db/redis";
import { authLimiter } from "../middleware/rate-limit";
import bcrypt from "bcryptjs";

const router: Router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      isActive: true,
    },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, error: "Account disabled" });
  }

  const [platformMember, sellerMember] = await Promise.all([
    db.platformMember.findFirst({
      where: { userId: user.id },
      select: { role: { select: { name: true } } },
    }),
    db.sellerMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { sellerId: true },
    }),
  ]);

  let role = "user";
  if (platformMember?.role?.name) {
    role = platformMember.role.name;
  } else if (sellerMember?.sellerId) {
    role = "seller";
  }

  const { accessToken, refreshToken } = jwtService.signTokens({
    sub: user.id,
    email: user.email,
    role,
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info({ userId: user.id }, "User logged in");

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name ?? undefined },
  });
});

router.post("/logout", protect, async (req, res) => {
  try {
    const auth = req.headers.authorization!;
    const token = auth.split(" ")[1];
    const payload = jwtService.verifyToken(token as string);

    if (payload.jti) {
      const ttl = payload.exp
        ? payload.exp - Math.floor(Date.now() / 1000)
        : 900;
      await redis.setex(RedisKeys.tokenBlacklist(payload.jti), ttl, "1");
    }

    logger.info({ userId: req.user!.id }, "User logged out");
    return res.json({ success: true, message: "Logged out" });
  } catch (error: any) {
    logger.error({ err: error.message }, "Logout failed");
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

router.post("/refresh", authLimiter, async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const { accessToken, refreshToken } =
      jwtService.refreshToken(oldRefreshToken);
    return res.json({ success: true, accessToken, refreshToken });
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.get("/me", protect, async (req, res) => {
  if (!req.user)
    return res.status(401).json({ success: false, error: "Unauthorized" });

  const [sellerMemberships, platformMember] = await Promise.all([
    db.sellerMember.findMany({
      where: { userId: req.user.id, isActive: true },
      select: {
        sellerId: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
        seller: { select: { businessName: true, status: true } },
      },
    }),
    db.platformMember.findUnique({
      where: { userId: req.user.id },
      select: { role: { select: { name: true } } },
    }),
  ]);

  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    },
    contexts: {
      isCustomer: true,
      isPlatformAdmin: !!platformMember,
      platformRole: platformMember?.role.name ?? null,
      sellerMemberships: sellerMemberships.map((m) => ({
        sellerId: m.sellerId,
        role: m.role.name,
        businessName: m.seller.businessName,
        sellerStatus: m.seller.status,
        permissions: m.role.permissions.map((p) => p.permission.key),
      })),
    },
  });
});

export default router;
