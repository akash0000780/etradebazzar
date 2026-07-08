import { z } from "zod";

const scopeTypeEnum = z.enum(["ALL", "CATEGORY", "PRODUCT", "USER_SEGMENT"]);
const couponTypeEnum = z.enum(["PERCENTAGE", "FIXED"]);

export const createCouponSchema = z.object({
    body: z.object({
        code: z.string().min(3).max(30),
        type: couponTypeEnum,
        value: z.number().positive(),
        currency: z.string().optional(),
        minOrder: z.number().positive().optional(),
        maxUses: z.number().int().positive().optional(),
        perUserLimit: z.number().int().positive().optional(),
        expiresAt: z.string().datetime().optional(),
        isStackable: z.boolean().optional(),
        scopeType: scopeTypeEnum.optional(),
        scopeIds: z.array(z.string()).optional(),
        firstTimeOnly: z.boolean().optional(),
        userSegment: z.string().optional(),
    }),
});

export const bulkGenerateCouponSchema = z.object({
    body: z.object({
        prefix: z.string().min(2).max(15),
        count: z.number().int().positive().max(1000),
        type: couponTypeEnum,
        value: z.number().positive(),
        currency: z.string().optional(),
        minOrder: z.number().positive().optional(),
        expiresAt: z.string().datetime().optional(),
        scopeType: scopeTypeEnum.optional(),
        scopeIds: z.array(z.string()).optional(),
    }),
});

export const validateCouponSchema = z.object({
    body: z.object({
        code: z.string().min(3),
        orderAmount: z.number().positive(),
        productIds: z.array(z.string()).optional(),
        categoryIds: z.array(z.string()).optional(),
    }),
});

export const updateCouponSchema = z.object({
    params: z.object({ couponId: z.string() }),
    body: z.object({
        isActive: z.boolean().optional(),
        expiresAt: z.string().datetime().optional(),
        maxUses: z.number().int().positive().optional(),
        minOrder: z.number().positive().optional(),
    }),
});

export const couponParamSchema = z.object({
    params: z.object({ couponId: z.string() }),
});

export const listCouponsSchema = z.object({
    query: z.object({
        isActive: z.enum(["true", "false"]).optional(),
        scopeType: scopeTypeEnum.optional(),
    }),
});