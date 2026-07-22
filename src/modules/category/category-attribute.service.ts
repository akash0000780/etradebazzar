import { db } from "../../db/index";

export const categoryAttributeService = {
  async createAttribute(
    categoryId: string,
    data: {
      key: string;
      label: string;
      type: "TEXT" | "NUMBER" | "ENUM" | "BOOLEAN";
      required: boolean;
      isVariant: boolean;
      options: string[];
      unit?: string;
      sortOrder: number;
    },
  ) {
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new Error("Category not found");

    const existing = await db.categoryAttribute.findUnique({
      where: { categoryId_key: { categoryId, key: data.key } },
    });
    if (existing) throw new Error("Attribute key already exists for this category");

    return db.categoryAttribute.create({
      data: {
        categoryId,
        key: data.key,
        label: data.label,
        type: data.type,
        required: data.required,
        isVariant: data.isVariant,
        options: data.options,
        unit: data.unit,
        sortOrder: data.sortOrder,
      },
    });
  },

  async updateAttribute(
    categoryId: string,
    attributeId: string,
    data: Partial<{
      label: string;
      type: "TEXT" | "NUMBER" | "ENUM" | "BOOLEAN";
      required: boolean;
      isVariant: boolean;
      options: string[];
      unit: string;
      sortOrder: number;
    }>,
  ) {
    const attribute = await db.categoryAttribute.findFirst({
      where: { id: attributeId, categoryId },
    });
    if (!attribute) throw new Error("Attribute not found");

    const nextType = data.type ?? attribute.type;
    const nextOptions = data.options ?? attribute.options;
    if (nextType === "ENUM" && nextOptions.length === 0) {
      throw new Error("options is required when type is ENUM");
    }
    if (nextType !== "ENUM" && nextOptions.length > 0) {
      throw new Error("options is only allowed when type is ENUM");
    }

    return db.categoryAttribute.update({
      where: { id: attributeId },
      data,
    });
  },

  async deleteAttribute(categoryId: string, attributeId: string) {
    const attribute = await db.categoryAttribute.findFirst({
      where: { id: attributeId, categoryId },
    });
    if (!attribute) throw new Error("Attribute not found");

    await db.categoryAttribute.delete({ where: { id: attributeId } });
  },

  async listAttributes(categoryId: string) {
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new Error("Category not found");

    return db.categoryAttribute.findMany({
      where: { categoryId },
      orderBy: { sortOrder: "asc" },
    });
  },
};
