import { PrismaClient } from "../../prisma/generated/client";
import { logger } from "../utils/logger";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: [
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "info" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

async function connectWithRetry(attempt = 1, maxAttempts = 10) {
  try {
    await db.$connect();
    logger.info("Prisma connected  postgres");
  } catch (error: any) {
    logger.error({ attempt, err: error.message }, "Prisma connection failed");
    if (attempt >= maxAttempts) {
      logger.error("Max connection attempts reached");
      process.exit(1);
    }
    const delay = Math.min(1000 * 2 ** attempt, 30000);
    logger.info(`Retry ${attempt + 1} in ${delay / 1000}s...`);
    setTimeout(() => connectWithRetry(attempt + 1, maxAttempts), delay);
  }
}

async function shutdown() {
  await db.$disconnect();
  logger.info("Prisma disconnected");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

connectWithRetry();
