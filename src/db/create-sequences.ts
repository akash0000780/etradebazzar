import { db } from "./index";
import { logger } from "../utils/logger";

async function createSequences() {
  const sequences = [
    "shop_display_seq",
    "product_display_seq",
    "shipment_display_seq",
    "order_display_seq",
  ];

  for (const seq of sequences) {
    await db.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seq} START 1`);
    logger.info(`Created sequence: ${seq}`);
  }

  await db.$disconnect();
  process.exit(0);
}

createSequences().catch((err) => {
  logger.error({ err: err.message }, "Failed to create sequences");
  process.exit(1);
});
