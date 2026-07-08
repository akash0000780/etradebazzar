import { db } from "./index";

import { logger } from "../utils/logger";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logger.info("Skipping database migrations in production");

    return;
  }

  logger.info("Running database health check in development...");

  try {
    await db.$executeRaw`SELECT 1`;

    logger.info("Database connection successful");
  } catch (error: any) {
    logger.error({ err: error.message }, "Database connection failed");

    process.exit(1);
  }
}

main();
