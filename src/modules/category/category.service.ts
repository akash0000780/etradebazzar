import { db } from "../../db/index";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const categoryService = {
  async createCategory(data: {
    name: string;
    description?: string;
    parentId?: string;
  }) {
    const slug = generateSlug(data.name);

    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) throw new Error("Category already exists");

    if (data.parentId) {
      const parent = await db.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) throw new Error("Parent category not found");
    }

    return db.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId,
      },
    });
  },

  async updateCategory(
    categoryId: string,
    data: { name?: string; description?: string; parentId?: string },
  ) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new Error("Category not found");

    // prevent circular ref
    if (data.parentId) {
      if (data.parentId === categoryId)
        throw new Error("Category cannot be its own parent");
      const parent = await db.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) throw new Error("Parent category not found");
    }

    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = generateSlug(data.name);
    }

    return db.category.update({ where: { id: categoryId }, data: updateData });
  },

  async deleteCategory(categoryId: string) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: { select: { children: true, products: true } },
      },
    });
    if (!category) throw new Error("Category not found");
    if (category._count.children > 0)
      throw new Error("Category has subcategories  delete them first");
    if (category._count.products > 0)
      throw new Error("Category has products  reassign before deleting");

    return db.category.delete({ where: { id: categoryId } });
  },

  async listCategories(parentId?: string) {
    return db.category.findMany({
      where: { parentId: parentId ?? null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        _count: { select: { children: true, products: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  // full nested tree for category picker
  async getCategoryTree() {
    const all = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
      },
      orderBy: { name: "asc" },
    });

    return buildTree(all, null);
  },

  async getCategory(categoryId: string) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new Error("Category not found");
    return category;
  },
};

type FlatCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
};

type TreeCategory = FlatCategory & { children: TreeCategory[] };

function buildTree(
  items: FlatCategory[],
  parentId: string | null,
): TreeCategory[] {
  return items
    .filter((item) => item.parentId === parentId)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}
