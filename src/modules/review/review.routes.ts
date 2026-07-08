import { Router } from "express";
import multer from "multer";
import { reviewController } from "./review.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole, requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { publicLimiter, sellerLimiter, uploadLimiter } from "../../middleware/rate-limit";
import {
    createReviewSchema, replyReviewSchema, moderateReviewSchema,
    reviewParamSchema, productReviewsSchema,
} from "./review.schema";

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Public
router.get(
    "/product/:productId",
    publicLimiter,
    validate(productReviewsSchema),
    reviewController.getProductReviews
);

// Customer
router.post(
    "/",
    protect,
    uploadLimiter,
    upload.array("media", 5),
    validate(createReviewSchema),
    reviewController.createReview
);

router.post(
    "/:reviewId/helpful",
    protect,
    sellerLimiter,
    validate(reviewParamSchema),
    reviewController.markHelpful
);

// Seller
router.get(
    "/seller",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    reviewController.getSellerReviews
);

router.patch(
    "/:reviewId/reply",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(replyReviewSchema),
    reviewController.replyToReview
);

// Platform admin
router.get(
    "/pending",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin", "product_reviewer"),
    reviewController.listPendingReviews
);

router.patch(
    "/:reviewId/moderate",
    protect,
    sellerLimiter,
    setPlatformAdmin,
    requirePlatformRole("super_admin", "product_reviewer"),
    validate(moderateReviewSchema),
    reviewController.moderateReview
);

export default router;