import { z } from "zod";

export const createReviewSchema = z.object({
    body: z.object({
        orderId: z.string(),
        productId: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().min(10).max(2000).optional(),
    }),
});

export const replyReviewSchema = z.object({
    params: z.object({ reviewId: z.string() }),
    body: z.object({ reply: z.string().min(5).max(1000) }),
});

export const moderateReviewSchema = z.object({
    params: z.object({ reviewId: z.string() }),
    body: z.object({ action: z.enum(["APPROVED", "REJECTED"]) }),
});

export const reviewParamSchema = z.object({
    params: z.object({ reviewId: z.string() }),
});

export const productReviewsSchema = z.object({
    params: z.object({ productId: z.string() }),
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        rating: z.string().regex(/^[1-5]$/).optional(),
    }),
});