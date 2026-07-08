import { BaseView } from "./base.view";

export class SellerOrderStatsView extends BaseView {
    readonly name = "mv_seller_order_stats";

    readonly createSql = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_seller_order_stats AS
        SELECT
            o."sellerId"                                                AS seller_id,
            COUNT(*)::int                                               AS total_orders,
            COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::int        AS delivered_orders,
            COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int        AS cancelled_orders,
            COUNT(*) FILTER (WHERE o.status = 'PENDING')::int          AS pending_orders,
            COUNT(*) FILTER (WHERE o.status = 'PROCESSING')::int       AS processing_orders,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") ELSE 0 END
            ), 0)                                                       AS gross_revenue,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."commissionAmount", 0) ELSE 0 END
            ), 0)                                                       AS total_commission,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") - COALESCE(o."commissionAmount", 0)
                ELSE 0 END
            ), 0)                                                       AS net_revenue,
            COUNT(*) FILTER (WHERE o.type = 'HIGH_TICKET')::int        AS high_ticket_orders,
            COUNT(*) FILTER (WHERE o.type = 'BULK')::int               AS bulk_orders,
            COUNT(*) FILTER (WHERE o.type = 'SAMPLE')::int             AS sample_orders,
            MIN(o."createdAt")                                          AS first_order_at,
            MAX(o."createdAt")                                          AS last_order_at
        FROM orders o
        GROUP BY o."sellerId"
        WITH DATA;
    `;

    readonly indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_seller_order_stats_seller
         ON mv_seller_order_stats (seller_id)`,
    ];
}