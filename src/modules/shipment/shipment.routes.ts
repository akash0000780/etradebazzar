import { Router } from "express";
import { shipmentController } from "./shipment.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { requireSellerRole } from "../../middleware/rbac";
import { sellerLimiter, } from "../../middleware/rate-limit";
import express from "express";
import { validate } from "../../utils/validate";
import {
    bulkCancelShipmentsSchema,
    shipmentParamSchema,
    serviceabilitySchema,
} from "./shipment.schema";
const router = Router();

//Seller
router.get(
    "/with-orders",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    shipmentController.listShipmentsWithOrders
);

router.get(
    "/",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    shipmentController.listShipments
);

router.get(
    "/serviceability",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    validate(serviceabilitySchema),
    shipmentController.checkServiceability
);

router.get(
    "/:shipmentId/with-order",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    validate(shipmentParamSchema),
    shipmentController.getShipmentWithOrder
);

router.get(
    "/:shipmentId",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    validate(shipmentParamSchema),
    shipmentController.getShipment
);

router.get(
    "/:shipmentId/track",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager", "staff"),
    validate(shipmentParamSchema),
    shipmentController.trackShipment
);

router.patch(
    "/:shipmentId/cancel",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(shipmentParamSchema),
    shipmentController.cancelShipment
);

router.post(
    "/bulk-cancel",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    validate(bulkCancelShipmentsSchema),
    shipmentController.bulkCancel
);

router.get(
    "/export",
    protect,
    sellerLimiter,
    resolveTenant,
    requireSellerRole("owner", "manager"),
    shipmentController.exportShipmentsCsv
);

router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    shipmentController.handleWebhook
);
export default router;