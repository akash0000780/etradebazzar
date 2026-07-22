import { z } from "zod";

const attributeTypeEnum = z.enum(["TEXT", "NUMBER", "ENUM", "BOOLEAN"]);

export const categoryAttributeInputSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, "key must be snake_case, starting with a letter"),
    label: z.string().min(1).max(100),
    type: attributeTypeEnum,
    required: z.boolean().default(false),
    isVariant: z.boolean().default(false),
    options: z.array(z.string().min(1).max(100)).default([]),
    unit: z.string().max(20).optional(),
    sortOrder: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.type === "ENUM" && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "options is required when type is ENUM",
        path: ["options"],
      });
    }
    if (data.type !== "ENUM" && data.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "options is only allowed when type is ENUM",
        path: ["options"],
      });
    }
  });

export type CategoryAttributeInput = z.infer<typeof categoryAttributeInputSchema>;

export const createCategoryAttributeSchema = z.object({
  params: z.object({ categoryId: z.string() }),
  body: categoryAttributeInputSchema,
});

export const updateCategoryAttributeSchema = z.object({
  params: z.object({ categoryId: z.string(), attributeId: z.string() }),
  body: z
    .object({
      label: z.string().min(1).max(100).optional(),
      type: attributeTypeEnum.optional(),
      required: z.boolean().optional(),
      isVariant: z.boolean().optional(),
      options: z.array(z.string().min(1).max(100)).optional(),
      unit: z.string().max(20).optional(),
      sortOrder: z.number().int().optional(),
    })
    .refine((data) => data.type !== "ENUM" || data.options === undefined || data.options.length > 0, {
      message: "options is required when type is ENUM",
      path: ["options"],
    }),
});

export const categoryAttributeParamSchema = z.object({
  params: z.object({ categoryId: z.string(), attributeId: z.string() }),
});

export const listCategoryAttributesSchema = z.object({
  params: z.object({ categoryId: z.string() }),
});
