import { BaseView } from "./base.view";

export class PlatformDailyStatsView extends BaseView {
    readonly name = "mv_platform_daily_stats";

    readonly createSql = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_daily_stats AS
        SELECT
            DATE(o."createdAt")                                         AS date,
            COUNT(*)::int                                               AS total_orders,
            COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::int        AS delivered_orders,
            COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int        AS cancelled_orders,
            COUNT(DISTINCT o."sellerId")::int                           AS active_sellers,
            COUNT(DISTINCT o."customerId")::int                         AS active_customers,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") ELSE 0 END
            ), 0)                                                       AS gmv,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."commissionAmount", 0) ELSE 0 END
            ), 0)                                                       AS total_commission,
            COUNT(*) FILTER (WHERE o.type = 'HIGH_TICKET')::int        AS high_ticket_orders,
            COUNT(*) FILTER (WHERE o.type = 'BULK')::int               AS bulk_orders,
            COUNT(*) FILTER (WHERE o.type = 'STANDARD')::int           AS standard_orders,
            COUNT(*) FILTER (WHERE o.type = 'SAMPLE')::int             AS sample_orders
        FROM orders o
        GROUP BY DATE(o."createdAt")
        WITH DATA;
    `;

    readonly indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_platform_daily_stats_date
         ON mv_platform_daily_stats (date)`,
    ];
}