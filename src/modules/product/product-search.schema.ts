import { z } from "zod";

export const searchProductsSchema = z.object({
    query: z.object({
        q: z.string().min(1).max(200).optional(),
        categoryId: z.string().optional(),
        minPrice: z.string().regex(/^\d+(\.\d+)?$/, "Invalid minPrice").optional(),
        maxPrice: z.string().regex(/^\d+(\.\d+)?$/, "Invalid maxPrice").optional(),
        sellerId: z.string().optional(),
        shopId: z.string().optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        page: z.string().regex(/^\d+$/, "Invalid page").optional(),
        limit: z.string().regex(/^\d+$/, "Invalid limit").optional(),
    }),
});