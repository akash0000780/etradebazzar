import { Router } from "express";
import { verificationController } from "./verification.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole, requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import { sellerLimiter } from "../../middleware/rate-limit";
import {
    submitAadhaarSchema, submitGovtIdSchema, rejectVerificationSchema, sellerParamSchema,
} from "./verification.schema";

const router = Router();

// Seller
router.post("/aadhaar", protect, sellerLimiter, resolveTenant, requireSellerRole("owner"),
    validate(submitAadhaarSchema), verificationController.submitAadhaar);

router.post("/government-id", protect, sellerLimiter, resolveTenant, requireSellerRole("owner"),
    validate(submitGovtIdSchema), verificationController.submitGovernmentId);

router.get("/status", protect, sellerLimiter, resolveTenant, requireSellerRole("owner", "manager"),
    verificationController.getStatus);

// Platform admin
router.patch("/:sellerId/aadhaar/verify", protect, sellerLimiter, setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"), validate(sellerParamSchema),
    verificationController.verifyAadhaar);

router.patch("/:sellerId/aadhaar/reject", protect, sellerLimiter, setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"), validate(rejectVerificationSchema),
    verificationController.rejectAadhaar);

router.patch("/:sellerId/government-id/verify", protect, sellerLimiter, setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"), validate(sellerParamSchema),
    verificationController.verifyGovernmentId);

router.patch("/:sellerId/government-id/reject", protect, sellerLimiter, setPlatformAdmin,
    requirePlatformRole("super_admin", "onboarding_manager"), validate(rejectVerificationSchema),
    verificationController.rejectGovernmentId);

export default router;