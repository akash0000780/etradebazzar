import { Router } from "express";
import multer from "multer";
import { orderController } from "./order.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant, setPlatformAdmin } from "../../middleware/tenant";
import { requirePlatformRole, requireSellerRole } from "../../middleware/rbac";
import { validate } from "../../utils/validate";
import {
  sellerLimiter,
  publicLimiter,
  uploadLimiter,
} from "../../middleware/rate-limit";
import {
  createOrderSchema,
  submitProposalSchema,
  respondProposalSchema,
  assignShopSchema,
  orderParamSchema,
  setThresholdSchema,
  setCommissionSchema,
  bulkOrderActionSchema,
  bulkRespondNegotiationsSchema,
} from "./order.schema";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Static routes (must be before /:orderId to avoid shadowing)
router.get(
  "/export",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  orderController.exportOrdersCsv,
);

router.get(
  "/action-required",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager", "staff"),
  orderController.getActionRequired,
);

router.get(
  "/bulk-uploads",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager", "staff"),
  orderController.listBulkUploads,
);

router.get(
  "/all",
  protect,
  sellerLimiter,
  setPlatformAdmin,
  requirePlatformRole("super_admin"),
  orderController.listAllOrders,
);

router.post(
  "/bulk-action",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(bulkOrderActionSchema),
  orderController.bulkAction,
);

router.post(
  "/negotiate/bulk-respond",
  protect,
  sellerLimiter,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(bulkRespondNegotiationsSchema),
  orderController.bulkRespondNegotiations,
);

router.post(
  "/threshold",
  protect,
  resolveTenant,
  sellerLimiter,
  requireSellerRole("owner"),
  validate(setThresholdSchema),
  orderController.setThreshold,
);

router.post(
  "/commission",
  protect,
  setPlatformAdmin,
  sellerLimiter,
  requirePlatformRole("super_admin"),
  validate(setCommissionSchema),
  orderController.setCommission,
);

//Customer
router.post(
  "/",
  protect,
  publicLimiter,
  validate(createOrderSchema),
  orderController.createOrder,
);

router.post(
  "/bulk",
  protect,
  uploadLimiter,
  upload.single("file"),
  orderController.createBulkOrder,
);

router.post(
  "/:orderId/negotiate",
  protect,
  validate(submitProposalSchema),
  publicLimiter,
  orderController.submitProposal,
);

router.patch(
  "/:orderId/negotiate/:negotiationId",
  protect,
  publicLimiter,
  validate(respondProposalSchema),
  orderController.respondToProposal,
);

router.get(
  "/:orderId",
  protect,
  publicLimiter,
  validate(orderParamSchema),
  orderController.getOrder,
);

// Seller
router.get(
  "/",
  protect,
  resolveTenant,
  sellerLimiter,
  requireSellerRole("owner", "manager", "staff"),
  orderController.listOrders,
);

router.post(
  "/:orderId/negotiate/proposal",
  sellerLimiter,
  protect,
  resolveTenant,
  requireSellerRole("owner", "manager"),
  validate(submitProposalSchema),
  orderController.submitProposal,
);

router.patch(
  "/:orderId/addresses/:addressId/assign",
  protect,
  resolveTenant,
  sellerLimiter,
  requireSellerRole("owner", "manager", "staff"),
  validate(assignShopSchema),
  orderController.assignShopToAddress,
);

export default router;
