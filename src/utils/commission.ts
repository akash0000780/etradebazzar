import { db } from "../db/index";

export async function getCommissionRate(
  productId: string,
  category: string
): Promise<number> {
  const now = new Date();

  const productRate = await db.productCommission.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: now },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (productRate) return Number(productRate.rate);

  const categoryRate = await db.productCommission.findFirst({
    where: {
      productId: null,
      category,
      effectiveFrom: { lte: now },
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return Number(categoryRate?.rate ?? 0);
}

export async function isHighTicket(
  sellerId: string,
  category: string,
  totalAmount: number
): Promise<boolean> {
  const categoryThreshold = await db.orderThreshold.findFirst({
    where: { 
      sellerId,
      productCategory: category },
  });

  const threshold =
    categoryThreshold ??
    (await db.orderThreshold.findFirst({
      where: { sellerId, productCategory: null },
    }));
  if (!threshold) return false;
  return totalAmount > Number(threshold.amount);
}