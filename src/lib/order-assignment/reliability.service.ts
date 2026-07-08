import { db } from "../../db";
import { logger } from "../../utils/logger";

export const RELIABILITY_RULES = {
    MIN_ORDERS_FOR_TRUST: 50,
    TRUST_THRESHOLD: 95,
    DEMOTE_THRESHOLD: 80,
};

export const reliabilityService = {
    async recomputeReliability(shopId: string) {
        try {
            const [delivered, cancelled] = await Promise.all([
                db.order.count({ where: { assignedShopId: shopId, status: "DELIVERED" } }),
                db.order.count({ where: { assignedShopId: shopId, status: "CANCELLED" } }),
            ]);

            const totalCompleted = delivered + cancelled;
            if (totalCompleted === 0) return;

            const score = (delivered / totalCompleted) * 100;
            const roundedScore = Math.round(score * 100) / 100;

            const shop = await db.shop.findUnique({ where: { id: shopId }, select: { autoAssignEnabled: true } });
            if (!shop) return;

            let autoAssignEnabled = shop.autoAssignEnabled;

            if (!autoAssignEnabled && totalCompleted >= RELIABILITY_RULES.MIN_ORDERS_FOR_TRUST &&
                roundedScore >= RELIABILITY_RULES.TRUST_THRESHOLD) {
                autoAssignEnabled = true;
                logger.info({ shopId, score: roundedScore, totalCompleted }, "Shop promoted to trusted auto-assign");
            } else if (autoAssignEnabled && roundedScore < RELIABILITY_RULES.DEMOTE_THRESHOLD) {
                autoAssignEnabled = false;
                logger.warn({ shopId, score: roundedScore }, "Shop demoted from trusted auto-assign");
            }

            await db.shop.update({
                where: { id: shopId },
                data: { reliabilityScore: roundedScore, autoAssignEnabled },
            });
        } catch (err: any) {
            logger.error({ err: err.message, shopId }, "Reliability recompute failed");
        }
    },
};