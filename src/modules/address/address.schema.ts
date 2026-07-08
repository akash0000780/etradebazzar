import { z } from "zod";

export const createAddressSchema = z.object({
    body: z.object({
        label: z.string().optional(),
        receiverName: z.string().min(2),
        phone: z.string().regex(/^\+?[6-9]\d{9}$/),
        street: z.string().min(5),
        city: z.string().min(2),
        state: z.string().min(2),
        pincode: z.string().regex(/^\d{6}$/),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        isDefault: z.boolean().optional(),
    }),
});

export const updateAddressSchema = z.object({
    params: z.object({ addressId: z.string() }),
    body: z.object({
        label: z.string().optional(),
        receiverName: z.string().min(2).optional(),
        phone: z.string().regex(/^\+?[6-9]\d{9}$/).optional(),
        street: z.string().min(5).optional(),
        city: z.string().min(2).optional(),
        state: z.string().min(2).optional(),
        pincode: z.string().regex(/^\d{6}$/).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        isDefault: z.boolean().optional(),
    }),
});

export const addressParamSchema = z.object({ params: z.object({ addressId: z.string() }) });