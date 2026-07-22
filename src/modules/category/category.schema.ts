import { z } from "zod";
import { categoryAttributeInputSchema } from "./category-attribute.schema";

function noDuplicateKeys(attributes: { key: string }[] | undefined, ctx: z.RefinementCtx) {
  if (!attributes) return;
  const seen = new Set<string>();
  for (const attr of attributes) {
    if (seen.has(attr.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate attribute key "${attr.key}" in request`,
        path: ["attributes"],
      });
      return;
    }
    seen.add(attr.key);
  }
}

export const createCategorySchema = z.object({
    body: z
        .object({
            name: z.string().min(2).max(100),
            description: z.string().optional(),
            parentId: z.string().optional(),
            attributes: z.array(categoryAttributeInputSchema).optional(),
        })
        .superRefine((data, ctx) => noDuplicateKeys(data.attributes, ctx)),
});

export const updateCategorySchema = z.object({
    params: z.object({
        categoryId: z.string(),
    }),
    body: z
        .object({
            name: z.string().min(2).max(100).optional(),
            description: z.string().optional(),
            parentId: z.string().optional(),
            attributes: z.array(categoryAttributeInputSchema).optional(),
        })
        .superRefine((data, ctx) => noDuplicateKeys(data.attributes, ctx)),
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