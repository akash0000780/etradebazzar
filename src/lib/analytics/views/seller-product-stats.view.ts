import { BaseView } from "./base.view";

export class SellerProductStatsView extends BaseView {
    readonly name = "mv_seller_product_stats";

    readonly createSql = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_seller_product_stats AS
        SELECT
            p."sellerId"                                                AS seller_id,
            p.id                                                        AS product_id,
            p.name                                                      AS product_name,
            p."categoryId"                                              AS category_id,
            COUNT(oi.id)::int                                           AS total_order_items,
            COALESCE(SUM(oi.quantity), 0)::int                         AS total_units_sold,
            COALESCE(SUM(
                COALESCE(oi."finalUnitPrice", oi."unitPrice") * oi.quantity
            ), 0)                                                       AS total_revenue,
            COALESCE(AVG(
                COALESCE(oi."finalUnitPrice", oi."unitPrice")
            ), 0)                                                       AS avg_unit_price,
            COUNT(DISTINCT oi."orderId")::int                           AS distinct_orders
        FROM products p
        LEFT JOIN order_items oi ON oi."productId" = p.id
        LEFT JOIN orders o ON o.id = oi."orderId" AND o.status = 'DELIVERED'
        GROUP BY p."sellerId", p.id, p.name, p."categoryId"
        WITH DATA;
    `;

    readonly indexes = [
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_seller_product_stats_pk
         ON mv_seller_product_stats (seller_id, product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mv_seller_product_stats_revenue
         ON mv_seller_product_stats (seller_id, total_revenue DESC)`,
    ];
}