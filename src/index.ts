import app from "./app";
import { config } from "../config/config";
import { logger } from "./utils/logger";
import { redis } from "./db/redis";

const port = config.port;

const server = app.listen(port, () => {
  const address = server.address();
  const host =
    typeof address === "string" ? address : address?.address || "localhost";
  const actualPort = typeof address === "string" ? port : address?.port || port;
  const url = `http://${host === "::" ? "localhost" : host}:${actualPort}`;
  logger.info(`Server running at ${url}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received  shutting down`);
  server.close(async () => {
    await redis.quit();
    logger.info("Redis disconnected");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err: err.message }, "Uncaught exception  shutting down");
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 5000);
});

process.on("unhandledRejection", (reason: any) => {
  logger.error(
    { err: reason?.message || reason },
    "Unhandled rejection  shutting down",
  );
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 5000);
});
