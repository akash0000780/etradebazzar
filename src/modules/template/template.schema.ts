import { z } from "zod";

export const createTemplateSchema = z.object({
    body: z.object({
        productId: z.string(),
        name: z.string().min(2).max(100),
        industry: z.string().optional(),
        style: z.string().optional(),
    }),
});

export const updateTemplateSchema = z.object({
    params: z.object({ templateId: z.string() }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        industry: z.string().optional(),
        style: z.string().optional(),
        canvasState: z.record(z.string(), z.any()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const templateParamSchema = z.object({
    params: z.object({ templateId: z.string() }),
});

export const productTemplatesParamSchema = z.object({
    params: z.object({ productId: z.string() }),
});