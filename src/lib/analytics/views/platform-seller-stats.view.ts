import { BaseView } from "./base.view";

export class PlatformSellerStatsView extends BaseView {
    readonly name = "mv_platform_seller_stats";

    readonly createSql = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_seller_stats AS
        SELECT
            s.id                                                        AS seller_id,
            s.name                                                      AS seller_name,
            s."businessName"                                            AS business_name,
            s.status,
            COUNT(DISTINCT sh.id)::int                                  AS total_shops,
            COUNT(DISTINCT p.id)::int                                   AS total_products,
            COUNT(DISTINCT o.id)::int                                   AS total_orders,
            COUNT(DISTINCT o.id) FILTER (
                WHERE o.status = 'DELIVERED'
            )::int                                                      AS delivered_orders,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") ELSE 0 END
            ), 0)                                                       AS gmv,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."commissionAmount", 0) ELSE 0 END
            ), 0)                                                       AS total_commission,
            COALESCE(SUM(
                CASE WHEN o.status = 'DELIVERED'
                THEN COALESCE(o."finalAmount", o."totalAmount") - COALESCE(o."commissionAmount", 0)
                ELSE 0 END
            ), 0)                                                       AS net_revenue,
            COUNT(DISTINCT rr.id)::int                                  AS total_returns,
            s."createdAt"                                               AS seller_since
        FROM sellers s
        LEFT JOIN shops sh ON sh."sellerId" = s.id
        LEFT JOIN products p ON p."sellerId" = s.id
        LEFT JOIN orders o ON o."sellerId" = s.id
        LEFT JOIN return_requests rr ON rr."orderId" = o.id
        GROUP BY s.id, s.name, s."businessName", s.status, s."createdAt"
        WITH DATA;
    `;

    readonly indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_platform_seller_stats_seller
         ON mv_platform_seller_stats (seller_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mv_platform_seller_stats_gmv
         ON mv_platform_seller_stats (gmv DESC)`,
    ];
}