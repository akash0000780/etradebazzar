import { z } from "zod";

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        description: z.string().optional(),
        parentId: z.string().optional(),
    }),
});

export const updateCategorySchema = z.object({
    params: z.object({
        categoryId: z.string(),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        description: z.string().optional(),
        parentId: z.string().optional(),
    }),
});

export const categoryParamSchema = z.object({
    params: z.object({
        categoryId: z.string(),
    }),
});

export const listCategoriesSchema = z.object({
    query: z.object({
        parentId: z.string().optional(),
    }),
});