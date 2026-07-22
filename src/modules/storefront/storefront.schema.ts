import { z } from "zod";

export const shopSlugParamSchema = z.object({
    params: z.object({ slug: z.string().min(1) }),
});

export const listShopProductsSchema = z.object({
    params: z.object({ slug: z.string().min(1) }),
    query: z.object({
        search: z.string().max(200).optional(),
        categoryId: z.string().optional(),
        page: z.string().regex(/^\d+$/, "Invalid page").optional(),
        limit: z.string().regex(/^\d+$/, "Invalid limit").optional(),
    }),
});

export const storefrontProductParamSchema = z.object({
    params: z.object({ productId: z.string() }),
});