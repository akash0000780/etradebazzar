import { db } from "../db/index";

export async function getCommissionRate(
  productId: string,
  category: string
): Promise<number> {
  const commission = await db.productCommission.findFirst({
    where: { OR: [{ productId }, { category }] },
    orderBy: { effectiveFrom: "desc" },
  });
  return Number(commission?.rate ?? 0);
}

export async function isHighTicket(
  sellerId: string,
  category: string,
  totalAmount: number
): Promise<boolean> {
  const threshold = await db.orderThreshold.findFirst({
    where: {
      sellerId,
      OR: [{ productCategory: category }, { productCategory: null }],
    },
    orderBy: { productCategory: "desc" },
  });
  if (!threshold) return false;
  return totalAmount > Number(threshold.amount);
}