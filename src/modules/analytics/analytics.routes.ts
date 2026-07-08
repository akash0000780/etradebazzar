import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole, requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import {
    sellerAnalyticsSchema,
    platformAnalyticsSchema,
    refreshViewSchema,
} from "./analytics.schema";

const router = Router();

// Seller
router.get(
    "/seller",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(sellerAnalyticsSchema),
    analyticsController.getSellerAnalytics
);

router.get(
    "/seller/revenue",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(sellerAnalyticsSchema),
    analyticsController.getSellerDailyRevenue
);

router.get(
    "/seller/products",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    analyticsController.getSellerTopProducts
);

router.get(
    "/seller/returns",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    analyticsController.getSellerReturnRate
);

// Platform Admin
router.get(
    "/platform",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"),
    validate(platformAnalyticsSchema),
    analyticsController.getPlatformAnalytics
);

router.get(
    "/platform/sellers",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"),
    analyticsController.getTopSellers
);

// Admin: manual refresh
router.post(
    "/refresh",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin"),
    analyticsController.refreshAllViews
);

router.post(
    "/refresh/:viewName",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin"),
    validate(refreshViewSchema),
    analyticsController.refreshView
);

export default router;