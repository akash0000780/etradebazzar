import { db } from "../../db/index";
import { Prisma } from "../../../prisma/generated/client";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export interface SearchProductsInput {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    shopId?: string;
    page?: number;
    limit?: number;
}

async function getAllCategoryIds(categoryId: string): Promise<string[]> {
    const all = await db.category.findMany({
        select: { id: true, parentId: true },
    });

    const childMap = new Map<string, string[]>();
    for (const cat of all) {
        if (cat.parentId) {
            const children = childMap.get(cat.parentId) ?? [];
            children.push(cat.id);
            childMap.set(cat.parentId, children);
        }
    }

    const result: string[] = [];
    const queue = [categoryId];

    while (queue.length) {
        const current = queue.shift()!;
        result.push(current);
        const children = childMap.get(current) ?? [];
        queue.push(...children);
    }

    return result;
}

export const productSearchService = {
    async searchProducts(input: SearchProductsInput) {
        const page = Math.max(1, input.page ?? 1);
        const limit = Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT);
        const skip = (page - 1) * limit;

        let categoryIds: string[] | undefined;
        if (input.categoryId) {
            categoryIds = await getAllCategoryIds(input.categoryId);
        }

        const where: Prisma.ProductWhereInput = {
            status: "APPROVED",

            ...(input.q && {
                OR: [
                    { name: { contains: input.q, mode: "insensitive" } },
                    { description: { contains: input.q, mode: "insensitive" } },
                ],
            }),

            ...(categoryIds && { categoryId: { in: categoryIds } }),
            ...(input.sellerId && { sellerId: input.sellerId }),
            ...(input.shopId && { shopId: input.shopId }),

            ...((input.minPrice !== undefined || input.maxPrice !== undefined) && {
                OR: [
                    {
                        price: {
                            ...(input.minPrice !== undefined && { gte: input.minPrice }),
                            ...(input.maxPrice !== undefined && { lte: input.maxPrice }),
                        },
                    },
                    {
                        skus: {
                            some: {
                                price: {
                                    ...(input.minPrice !== undefined && { gte: input.minPrice }),
                                    ...(input.maxPrice !== undefined && { lte: input.maxPrice }),
                                },
                            },
                        },
                    },
                ],
            }),
        };

        const [products, total] = await Promise.all([
            db.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    compareAtPrice: true,
                    sku: true,
                    stock: true,
                    isDigital: true,
                    status: true,
                    createdAt: true,
                    category: { select: { id: true, name: true, slug: true } },
                    shop: { select: { id: true, name: true, slug: true } },
                    images: {
                        orderBy: { order: "asc" },
                        take: 1,
                        select: { url: true },
                    },
                    skus: {
                        select: { id: true, sku: true, price: true, stock: true, minQuantity: true, options: true },
                        orderBy: { price: "asc" },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.product.count({ where }),
        ]);

        return {
            products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    },
};