import { db } from "./index";
import { logger } from "../utils/logger";
import { readFileSync } from "fs";
import { join } from "path";
import { analyticsRegistry } from "../lib/analytics/analytics.registry";

async function runRLSMigration() {
  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        DROP POLICY IF EXISTS tenant_isolation ON shops;
        DROP POLICY IF EXISTS tenant_isolation ON products;
        DROP POLICY IF EXISTS tenant_isolation ON seller_members;
        DROP POLICY IF EXISTS tenant_isolation ON seller_roles;
      END $$;
    `);

    const sql = readFileSync(
      join(process.cwd(), "prisma/migrations/rls_setup.sql"),
      "utf-8"
    );
    await db.$executeRawUnsafe(sql);
    logger.info("RLS migration applied");
  } catch (error: any) {
    logger.error({ err: error.message }, "RLS migration failed");
    process.exit(1);
  }
}

async function createAnalyticsViews() {
  try {
    await analyticsRegistry.createAll();
    logger.info("Analytics materialized views created");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Analytics views creation skipped - may already exist");
  }
}

async function main() {
  await runRLSMigration();
  await createAnalyticsViews();
  process.exit(0);
}

main();