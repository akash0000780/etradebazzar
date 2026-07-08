import { z } from "zod";

const periodEnum = z.enum(["7d", "30d", "90d"]).optional();

const dateRangeQuery = z.object({
    period: periodEnum,
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
}).refine(
    (data) => {
        if (data.from && !data.to) return false;
        if (data.to && !data.from) return false;
        return true;
    },
    { message: "Both from and to are required for custom date range" }
);

export const sellerAnalyticsSchema = z.object({
    query: dateRangeQuery,
});

export const platformAnalyticsSchema = z.object({
    query: dateRangeQuery,
});

export const refreshViewSchema = z.object({
    params: z.object({
        viewName: z.enum([
            "seller_order_stats",
            "seller_product_stats",
            "seller_daily_revenue",
            "platform_daily_stats",
            "platform_seller_stats",
        ]),
    }),
});