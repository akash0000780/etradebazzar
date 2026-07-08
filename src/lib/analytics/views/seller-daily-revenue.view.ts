import { BaseView } from "./base.view";

export class SellerDailyRevenueView extends BaseView {
    readonly name = "mv_seller_daily_revenue";

    readonly createSql = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_seller_daily_revenue AS
        SELECT
            o."sellerId"                                                AS seller_id,
            DATE(o."createdAt")                                         AS date,
            COUNT(*)::int                                               AS total_orders,
            COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::int        AS delivered_orders,
            COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int        AS cancelled_orders,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") ELSE 0 END
            ), 0)                                                       AS gross_revenue,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."commissionAmount", 0) ELSE 0 END
            ), 0)                                                       AS commission,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") - COALESCE(o."commissionAmount", 0)
                ELSE 0 END
            ), 0)                                                       AS net_revenue
        FROM orders o
        GROUP BY o."sellerId", DATE(o."createdAt")
        WITH DATA;
    `;

    readonly indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_seller_daily_revenue_pk
         ON mv_seller_daily_revenue (seller_id, date)`,
        `CREATE INDEX IF NOT EXISTS idx_mv_seller_daily_revenue_date
         ON mv_seller_daily_revenue (date DESC)`,
    ];
}