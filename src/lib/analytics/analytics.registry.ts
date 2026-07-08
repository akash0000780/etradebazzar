import { logger } from "../../utils/logger";
import { BaseView } from "./views/base.view";
import { PlatformDailyStatsView } from "./views/platform-daily-stats.view";
import { PlatformSellerStatsView } from "./views/platform-seller-stats.view";
import { SellerDailyRevenueView } from "./views/seller-daily-revenue.view";
import { SellerOrderStatsView } from "./views/seller-order-stats.view";
import { SellerProductStatsView } from "./views/seller-product-stats.view";

export type ViewName =
    | "seller_order_stats"
    | "seller_product_stats"
    | "seller_daily_revenue"
    | "platform_daily_stats"
    | "platform_seller_stats";

const VIEW_REGISTRY: Record<ViewName, BaseView> = {
    seller_order_stats: new SellerOrderStatsView(),
    seller_product_stats: new SellerProductStatsView(),
    seller_daily_revenue: new SellerDailyRevenueView(),
    platform_daily_stats: new PlatformDailyStatsView(),
    platform_seller_stats: new PlatformSellerStatsView(),
}
export const analyticsRegistry = {
    async createAll(): Promise<void> {
        for (const [name, view] of Object.entries(VIEW_REGISTRY)) {
            try {
                await view.create();
            } catch (err: any) {
                logger.error({ err: err.message, view: name }, "View creation failed");
            }
        }
    },

    async refresh(viewName: ViewName): Promise<void> {
        const view = VIEW_REGISTRY[viewName];
        if (!view) throw new Error(`Unknown view: ${viewName}`);
        await view.refresh();
    },

    async refreshMany(viewNames: ViewName[]): Promise<void> {
        await Promise.allSettled(
            viewNames.map((name) => analyticsRegistry.refresh(name))
        );
    },

    async refreshAll(): Promise<void> {
        await analyticsRegistry.refreshMany(Object.keys(VIEW_REGISTRY) as ViewName[]);
    },

    getViewNames(): ViewName[] {
        return Object.keys(VIEW_REGISTRY) as ViewName[];
    },
};