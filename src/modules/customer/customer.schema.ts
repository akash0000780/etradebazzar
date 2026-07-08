import { z } from "zod";

export const registerCustomerSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string().optional(),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({ name: z.string().min(2).max(100).optional() }),
});

export const listMyOrdersSchema = z.object({
    query: z.object({
        status: z.string().optional(),
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
    }),
});