import { db } from "../../db/index";

export const printAreaService = {
    async setPrintArea(
        sellerId: string,
        productId: string,
        data: { widthCm: number; heightCm: number; safetyMarginCm?: number; bleedMarginCm?: number }
    ) {
        const product = await db.product.findFirst({ where: { id: productId, sellerId } });
        if (!product) throw new Error("Product not found");

        return db.printArea.upsert({
            where: { productId },
            update: {
                widthCm: data.widthCm,
                heightCm: data.heightCm,
                safetyMarginCm: data.safetyMarginCm,
                bleedMarginCm: data.bleedMarginCm,
            },
            create: {
                productId,
                widthCm: data.widthCm,
                heightCm: data.heightCm,
                safetyMarginCm: data.safetyMarginCm ?? 0.5,
                bleedMarginCm: data.bleedMarginCm ?? 0.3,
            },
        });
    },

    async getPrintArea(productId: string) {
        const printArea = await db.printArea.findUnique({ where: { productId } });
        if (!printArea) throw new Error("Print area not configured for this product");
        return printArea;
    },

    async deletePrintArea(sellerId: string, productId: string) {
        const product = await db.product.findFirst({ where: { id: productId, sellerId } });
        if (!product) throw new Error("Product not found");

        try {
            await db.printArea.delete({ where: { productId } });
            return { deleted: true };
        } catch (err: any) {
            if (err.code === "P2025") {
                return { deleted: false };
            }
            throw err;
        }
    },
};