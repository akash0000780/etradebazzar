import { Router } from "express";
import { couponController } from "./coupon.controller";
import { protect } from "../../middleware/auth";
import { requirePlatformAdmin } from "../../middleware/tenant";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
    createCouponSchema, bulkGenerateCouponSchema, validateCouponSchema,
    updateCouponSchema, couponParamSchema, listCouponsSchema,
} from "./coupon.schema";

const router = Router();

// Customer coupon at checkout
router.post(
    "/validate",
    protect,
    publicLimiter,
    validate(validateCouponSchema),
    couponController.validateCoupon
);

// Platform admin
router.post(
    "/",
    protect,
    requirePlatformAdmin("super_admin"),
    sellerLimiter,
    validate(createCouponSchema),
    couponController.createCoupon
);

router.post(
    "/bulk-generate",
    protect,
    requirePlatformAdmin("super_admin"),
    sellerLimiter,
    validate(bulkGenerateCouponSchema),
    couponController.bulkGenerateCoupons
);

router.get(
    "/",
    protect,
    requirePlatformAdmin("super_admin", "onboarding_manager"),
    sellerLimiter,
    validate(listCouponsSchema),
    couponController.listCoupons
);

router.get(
    "/:couponId",
    protect,
    requirePlatformAdmin("super_admin", "onboarding_manager"),
    sellerLimiter,
    validate(couponParamSchema),
    couponController.getCoupon
);

router.patch(
    "/:couponId",
    protect,
    requirePlatformAdmin("super_admin"),
    sellerLimiter,
    validate(updateCouponSchema),
    couponController.updateCoupon
);

router.patch(
    "/:couponId/deactivate",
    protect,
    requirePlatformAdmin("super_admin"),
    sellerLimiter,
    validate(couponParamSchema),
    couponController.deactivateCoupon
);

export default router;