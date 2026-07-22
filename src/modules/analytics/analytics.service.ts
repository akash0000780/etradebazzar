import { db } from "../../db/index";
import {
  analyticsRegistry,
  ViewName,
} from "../../lib/analytics/analytics.registry";

type Period = "7d" | "30d" | "90d";
const MAX_LIMIT = 100;

function getPeriodDate(period: Period): Date {
  const days = { "7d": 7, "30d": 30, "90d": 90 };
  const d = new Date();
  d.setDate(d.getDate() - days[period]);
  return d;
}

function getDateFilter(period?: Period, from?: string, to?: string) {
  if (from && to) {
    return { gte: new Date(from), lte: new Date(to) };
  }
  if (period) {
    return { gte: getPeriodDate(period) };
  }
  return undefined;
}

export const analyticsService = {
  // Seller Analytics
  async getSellerOverview(sellerId: string) {
    const result = await db.$queryRaw<any[]>`
            SELECT * FROM mv_seller_order_stats
            WHERE seller_id = ${sellerId}
        `;
    return result[0] ?? null;
  },

  async getSellerDailyRevenue(
    sellerId: string,
    period?: Period,
    from?: string,
    to?: string,
  ) {
    if (from && to) {
      return db.$queryRaw<any[]>`
                SELECT * FROM mv_seller_daily_revenue
                WHERE seller_id = ${sellerId}
                  AND date >= ${new Date(from)}
                  AND date <= ${new Date(to)}
                ORDER BY date ASC
            `;
    }

    const since = period ? getPeriodDate(period) : getPeriodDate("30d");
    return db.$queryRaw<any[]>`
            SELECT * FROM mv_seller_daily_revenue
            WHERE seller_id = ${sellerId}
              AND date >= ${since}
            ORDER BY date ASC
        `;
  },

  async getSellerTopProducts(sellerId: string, limit = 10) {
    const cappedLimit = Math.min(limit, MAX_LIMIT);
    return db.$queryRaw<any[]>`
            SELECT * FROM mv_seller_product_stats
            WHERE seller_id = ${sellerId}
            ORDER BY total_revenue DESC
            LIMIT ${cappedLimit}
        `;
  },

  async getSellerReturnRate(sellerId: string) {
    const result = await db.$queryRaw<any[]>`
            SELECT
                COUNT(DISTINCT o.id)::int           AS total_delivered,
                COUNT(DISTINCT rr.id)::int          AS total_returns,
                CASE
                    WHEN COUNT(DISTINCT o.id) > 0
                    THEN ROUND(
                        COUNT(DISTINCT rr.id)::numeric /
                        COUNT(DISTINCT o.id)::numeric * 100, 2
                    )
                    ELSE 0
                END                                 AS return_rate_pct
            FROM orders o
            LEFT JOIN return_requests rr ON rr.order_id = o.id
            WHERE o.seller_id = ${sellerId}
              AND o.status = 'DELIVERED'
        `;
    return result[0] ?? null;
  },

  async getSellerAnalytics(
    sellerId: string,
    period?: Period,
    from?: string,
    to?: string,
  ) {
    const [overview, dailyRevenue, topProducts, returnRate] = await Promise.all(
      [
        this.getSellerOverview(sellerId),
        this.getSellerDailyRevenue(sellerId, period, from, to),
        this.getSellerTopProducts(sellerId),
        this.getSellerReturnRate(sellerId),
      ],
    );

    return { overview, dailyRevenue, topProducts, returnRate };
  },

  // Platform Analytics

  async getPlatformOverview() {
    const result = await db.$queryRaw<any[]>`
            SELECT
                SUM(gmv)                AS total_gmv,
                SUM(total_commission)   AS total_commission,
                SUM(total_orders)::int  AS total_orders,
                SUM(delivered_orders)::int AS delivered_orders,
                COUNT(*)::int           AS total_sellers
            FROM mv_platform_seller_stats
            WHERE status = 'APPROVED'
        `;
    return result[0] ?? null;
  },

  async getPlatformDailyStats(period?: Period, from?: string, to?: string) {
    if (from && to) {
      return db.$queryRaw<any[]>`
                SELECT * FROM mv_platform_daily_stats
                WHERE date >= ${new Date(from)}
                  AND date <= ${new Date(to)}
                ORDER BY date ASC
            `;
    }

    const since = period ? getPeriodDate(period) : getPeriodDate("30d");
    return db.$queryRaw<any[]>`
            SELECT * FROM mv_platform_daily_stats
            WHERE date >= ${since}
            ORDER BY date ASC
        `;
  },

  async getTopSellers(limit = 10) {
    const cappedLimit = Math.min(limit, MAX_LIMIT);
    const rows = await db.$queryRaw<any[]>`
            SELECT * FROM mv_platform_seller_stats
            WHERE status = 'APPROVED'
            ORDER BY gmv DESC
            LIMIT ${cappedLimit}
        `;
    return rows.map((r) => ({
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      totalRevenue: Number(r.gmv) || 0,
      totalOrders: Number(r.total_orders) || 0,
      averageOrderValue:
        Number(r.total_orders) > 0 ? Number(r.gmv) / Number(r.total_orders) : 0,
      returnRate:
        Number(r.total_orders) > 0
          ? (Number(r.total_returns) / Number(r.total_orders)) * 100
          : 0,
    }));
  },

  async getPlatformAnalytics(period?: Period, from?: string, to?: string) {
    const [overview, dailyStats, topSellers] = await Promise.all([
      this.getPlatformOverview(),
      this.getPlatformDailyStats(period, from, to),
      this.getTopSellers(),
    ]);

    const o = overview ?? {};
    const totalSellers = Number(o.total_sellers) || 0;
    const totalOrders = Number(o.total_orders) || 0;
    const totalRevenue = Number(o.total_gmv) || 0;
    const totalCommission = Number(o.total_commission) || 0;
    const deliveredOrders = Number(o.delivered_orders) || 0;

    const [activeSellersRow, pendingSellersRow, totalProductsRow] =
      await Promise.all([
        db.seller.count({ where: { status: "APPROVED" } }),
        db.seller.count({ where: { status: "PENDING" } }),
        db.product.count(),
      ]);

    return {
      totalSellers,
      activeSellers: activeSellersRow,
      pendingSellers: pendingSellersRow,
      totalOrders,
      totalRevenue,
      totalProducts: totalProductsRow,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      dailyStats,
      topSellers,
    };
  },

  // Admin: manual refresh
  async refreshView(viewName: ViewName) {
    await analyticsRegistry.refresh(viewName);
    return { refreshed: viewName, at: new Date().toISOString() };
  },

  async refreshAllViews() {
    await analyticsRegistry.refreshAll();
    return { refreshed: "all", at: new Date().toISOString() };
  },
};
