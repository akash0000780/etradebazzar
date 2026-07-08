import { db } from "../db/index";

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export async function findNearestShop(
  sellerId: string,
  productIds: string[],
  lat?: number,
  lon?: number
): Promise<string | null> {
  const shops = await db.shop.findMany({
    where: {
      sellerId,
      status: "APPROVED",
      products: {
        some: {
          id: { in: productIds },
          status: "APPROVED",
          stock: { gt: 0 },
        },
      },
    },
    select: { id: true, latitude: true, longitude: true },
  });

  if (!shops.length) return null;
  if (!lat || !lon) return shops[0]!.id;

  let nearestId = shops[0]!.id;
  let minDistance = Infinity;

  for (const shop of shops) {
    if (!shop.latitude || !shop.longitude) continue;
    const distance = haversineDistance(
      lat, lon,
      Number(shop.latitude),
      Number(shop.longitude)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestId = shop.id;
    }
  }

  return nearestId;
}