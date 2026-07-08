import { Router } from "express";
import express from "express";
import { payoutController } from "./payout.controller";
import { protect } from "../../middleware/auth";
import { setPlatformAdmin, resolveTenant } from "../../middleware/tenant";
import { requirePlatformRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { paymentLimiter, sellerLimiter } from "../../middleware/rate-limit";
import {
  initiatePayoutSchema,
  payoutParamSchema,
  sellerPayoutParamSchema,
  setPlatformConfigSchema,
} from "./payout.schema";

const router = Router();

const platformGuard = [protect, setPlatformAdmin];

// Seller-facing: get own payout summary
router.get(
  "/me",
  protect,
  resolveTenant,
  sellerLimiter,
  payoutController.getMyPayoutSummary,
);

router.get(
  "/me/history",
  protect,
  resolveTenant,
  sellerLimiter,
  payoutController.getMyPayoutHistory,
);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  payoutController.webhook,
);
// Platform Configd
router.post(
  "/config",
  ...platformGuard,
  requirePlatformRole("super_admin"),
  sellerLimiter,
  validate(setPlatformConfigSchema),
  payoutController.setPlatformConfig,
);
//payout
router.get(
  "/sellers",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  payoutController.listAllSellersSummary,
);

router.get(
  "/sellers/:sellerId",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  validate(sellerPayoutParamSchema),
  payoutController.getSellerPayoutSummary,
);

router.post(
  "/sellers/:sellerId/initiate",
  ...platformGuard,
  requirePlatformRole("super_admin"),
  paymentLimiter,
  validate(initiatePayoutSchema),
  payoutController.initiatePayout,
);

// Histroy
router.get(
  "/history",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  payoutController.getPayoutHistory,
);

router.get(
  "/history/:sellerId",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  validate(sellerPayoutParamSchema),
  payoutController.getSellerPayoutHistory,
);

router.get(
  "/:payoutId",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  validate(payoutParamSchema),
  payoutController.getPayoutById,
);

router.get(
  "/config",
  ...platformGuard,
  requirePlatformRole("super_admin"),
  sellerLimiter,
  payoutController.getPayoutConfig,
);

router.get(
  "/sellers/:sellerId/export",
  ...platformGuard,
  requirePlatformRole("super_admin", "onboarding_manager"),
  sellerLimiter,
  payoutController.exportPayoutsCsv,
);

export default router;
