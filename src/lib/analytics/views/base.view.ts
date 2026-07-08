import { db } from "../../../db/index";
import { logger } from "../../../utils/logger";

export abstract class BaseView {
    abstract readonly name: string;       // e.g. "mv_seller_order_stats"
    abstract readonly createSql: string;
    abstract readonly indexes: string[];

    async create(): Promise<void> {
        try {
            await db.$executeRawUnsafe(this.createSql);
            for (const index of this.indexes) {
                await db.$executeRawUnsafe(index);
            }
            logger.info({ view: this.name }, "Materialized view created");
        } catch (err: any) {
            logger.error({ err: err.message, view: this.name }, "Failed to create view");
            throw err;
        }
    }

    async refresh(): Promise<void> {
        try {
            await db.$executeRawUnsafe(
                `REFRESH MATERIALIZED VIEW CONCURRENTLY ${this.name}`
            );
            logger.info({ view: this.name }, "Materialized view refreshed");
        } catch (err: any) {
            logger.error({ err: err.message, view: this.name }, "Failed to refresh view");
            throw err;
        }
    }

    async drop(): Promise<void> {
        await db.$executeRawUnsafe(
            `DROP MATERIALIZED VIEW IF EXISTS ${this.name}`
        );
    }
}