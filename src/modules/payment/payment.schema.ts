import { z } from "zod";

export const verifyPaymentSchema = z.object({
    body: z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
    }),
});

export const orderPaymentParamSchema = z.object({
    params: z.object({
        orderId: z.string(),
    }),
});

export const shipmentPaymentParamSchema = z.object({
    params: z.object({
        shipmentId: z.string(),
    }),
});