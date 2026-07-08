import { z } from "zod";

export const initiatePayoutSchema = z.object({
    params: z.object({ sellerId: z.string() }),
    body: z.object({
        method: z.enum(["UPI", "IMPS", "RTGS", "NEFT"]),
        note: z.string().optional(),
        periodStart: z.string().datetime().optional(),
        periodEnd: z.string().datetime().optional(),
    }),
});

export const payoutParamSchema = z.object({
    params: z.object({ payoutId: z.string() }),
});

export const sellerPayoutParamSchema = z.object({
    params: z.object({ sellerId: z.string() }),
});

export const setPlatformConfigSchema = z.object({
    body: z.object({
        key: z.string().min(1),
        value: z.string().min(1),
    }),
});