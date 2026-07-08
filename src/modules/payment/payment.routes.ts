import { Router } from "express";
import express from "express";
import { paymentController } from "./payment.controller";
import { protect } from "../../middleware/auth";
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
    paymentLimiter,
    validate(orderPaymentParamSchema),
    paymentController.createAdvancePayment
);

router.post(
    "/orders/:orderId/final",
    protect,
    paymentLimiter,
    validate(orderPaymentParamSchema),
    paymentController.createFinalPayment
);

router.post(
    "/verify",
    protect,
    paymentLimiter,
    validate(verifyPaymentSchema),
    paymentController.verifyPayment
);

router.post(
    "/orders/:orderId/refund",
    protect,
    paymentLimiter,
    validate(orderPaymentParamSchema),
    paymentController.initiateRefund
);

router.get(
    "/orders/:orderId",
    protect,
    publicLimiter,
    validate(orderPaymentParamSchema),
    paymentController.getPayments
);

export default router;