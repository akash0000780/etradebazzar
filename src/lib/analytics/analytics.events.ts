import { logger } from "../../utils/logger";
import { sseManager } from "../notifications/sse/sse.manager";
import { analyticsRegistry, ViewName } from "./analytics.registry";

const EVENT_VIEW_MAP: Record<string, ViewName[]> = {
    ORDER_DELIVERED: [
        "seller_order_stats",
        "seller_daily_revenue",
        "platform_daily_stats",
        "platform_seller_stats",
    ],
    ORDER_CANCELLED: [
        "seller_order_stats",
        "seller_daily_revenue",
        "platform_daily_stats",
        "platform_seller_stats",
    ],
    ORDER_CREATED: [
        "seller_daily_revenue",
        "platform_daily_stats",
    ],
    PRODUCT_ORDERED: [
        "seller_product_stats",
    ],
    PAYOUT_PAID: [
        "platform_seller_stats",
    ],
    RETURN_COMPLETED: [
        "platform_seller_stats",
        "seller_order_stats",
    ],
};

export type AnalyticsEvent = keyof typeof EVENT_VIEW_MAP;

export async function triggerAnalyticsRefresh(
    event: AnalyticsEvent,
    sellerId?: string,
    adminId?: string
): Promise<void> {
    const views = EVENT_VIEW_MAP[event];
    if (!views?.length) return;

    try {
        await analyticsRegistry.refreshMany(views);

        logger.info({ event, views }, "Analytics views refreshed");

        const payload = {
            id: `analytics_${Date.now()}`,
            type: "ANALYTICS_UPDATED",
            title: "Analytics updated",
            message: `Analytics data refreshed after ${event}`,
            data: { event, views, updatedAt: new Date().toISOString() },
            createdAt: new Date().toISOString(),
        };

        if (sellerId) {
            sseManager.publish(sellerId, payload).catch(() => null);
        }

        if (adminId) {
            sseManager.publish(adminId, payload).catch(() => null);
        }
    } catch (err) {
        if (err instanceof Error) {
            logger.error({ err: err.message, event }, "Analytics refresh failed");
        }
    }
}