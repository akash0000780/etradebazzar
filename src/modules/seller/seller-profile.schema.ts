import { z } from "zod";

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        alternatePhone: z.string().min(10).max(15).optional(),
        profileImage: z.string().url().optional(),
    }),
});

export const updateBusinessSchema = z.object({
    body: z.object({
        businessName: z.string().min(2).optional(),
        businessLogo: z.string().url().optional(),
        businessDescription: z.string().max(2000).optional(),
        industryCategory: z.string().optional(),
        yearOfEstablishment: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
        pickupAddress: z.object({
            street: z.string(), city: z.string(), state: z.string(), pincode: z.string(),
        }).optional(),
        billingAddress: z.object({
            street: z.string(), city: z.string(), state: z.string(), pincode: z.string(),
        }).optional(),
        socialLinks: z.object({
            website: z.string().url().optional(),
            instagram: z.string().url().optional(),
            facebook: z.string().url().optional(),
        }).optional(),
    }),
});

export const shopStatsParamSchema = z.object({
    params: z.object({ shopId: z.string() }),
});