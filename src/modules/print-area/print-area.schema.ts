import { z } from "zod";

export const setPrintAreaSchema = z.object({
    params: z.object({ productId: z.string() }),
    body: z.object({
        widthCm: z.number().positive(),
        heightCm: z.number().positive(),
        safetyMarginCm: z.number().nonnegative().optional(),
        bleedMarginCm: z.number().nonnegative().optional(),
    }),
});

export const productParamSchema = z.object({
    params: z.object({ productId: z.string() }),
});