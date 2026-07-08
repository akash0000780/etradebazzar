import { Router } from "express";
import { returnController } from "./return.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
    createReturnSchema,
    returnParamSchema,
    reviewReturnSchema,
    rejectReturnSchema,
} from "./return.schema";

const router = Router();

//Customer
router.post(
    "/",
    protect,
    publicLimiter,
    validate(createReturnSchema),
    returnController.createReturnRequest
);

router.get(
    "/my",
    protect,
    publicLimiter,
    returnController.listCustomerReturns
);

// Seller
router.get(
    "/",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    returnController.listReturnRequests
);

router.get(
    "/:returnId",
    protect,
    resolveTenant,
    publicLimiter,
    requireSellerRole("owner", "manager", "staff"),
    validate(returnParamSchema),
    returnController.getReturnRequest
);

router.patch(
    "/:returnId/approve",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(reviewReturnSchema),
    returnController.approveReturn
);

router.patch(
    "/:returnId/reject",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(rejectReturnSchema),
    returnController.rejectReturn
);

export default router;