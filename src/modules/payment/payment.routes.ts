import { Router } from "express";
import express from "express";
import { paymentController } from "./payment.controller";
import { protect } from "../../middleware/auth";
import { resolveTenant } from "../../middleware/tenant";
import { verifyOrderAccess } from "../../middleware/order-access";
import { validate } from "../../utils/validate";
import { paymentLimiter, publicLimiter } from "../../middleware/rate-limit";
import {
    verifyPaymentSchema,
    orderPaymentParamSchema,
} from "./payment.schema";

const router = Router();

router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    paymentController.webhook
);

router.post(
    "/orders/:orderId/advance",
    protect,
    resolveTenant,
    paymentLimiter,
    validate(orderPaymentParamSchema),
    verifyOrderAccess,
    paymentController.createAdvancePayment
);

router.post(
    "/orders/:orderId/final",
    protect,
    resolveTenant,
    paymentLimiter,
    validate(orderPaymentParamSchema),
    verifyOrderAccess,
    paymentController.createFinalPayment
);

router.post(
    "/verify",
    protect,
    resolveTenant,
    paymentLimiter,
    validate(verifyPaymentSchema),
    paymentController.verifyPayment
);

router.post(
    "/orders/:orderId/refund",
    protect,
    resolveTenant,
    paymentLimiter,
    validate(orderPaymentParamSchema),
    verifyOrderAccess,
    paymentController.initiateRefund
);

router.get(
    "/orders/:orderId",
    protect,
    resolveTenant,
    publicLimiter,
    validate(orderPaymentParamSchema),
    verifyOrderAccess,
    paymentController.getPayments
);

export default router;