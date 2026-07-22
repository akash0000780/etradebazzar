import { db } from "../src/db";
import { redis, RedisKeys } from "../src/db/redis";
import { assignDefaultRolePermissions, seedPlatformPermissions } from "../src/lib/permission/permission.service";
import { logger } from "../src/utils/logger";

async function fixPermissions() {
  logger.info("Fixing seller role permissions...");

  await db.$transaction(async (tx) => {
    await seedPlatformPermissions(tx);
  });

  const sellers = await db.seller.findMany({
    select: {
      id: true,
      roles: { select: { id: true, name: true } },
    },
  });

  let fixed = 0;
  for (const seller of sellers) {
    const roles = seller.roles.map((r) => ({ id: r.id, name: r.name }));
    if (roles.length === 0) {
      logger.info(`Seller ${seller.id} has no roles, skipping`);
      continue;
    }

    const existingPerms = await db.rolePermission.findFirst({
      where: { roleId: { in: roles.map((r) => r.id) } },
    });

    if (existingPerms) {
      logger.info(`Seller ${seller.id} already has role permissions, skipping`);
      continue;
    }

    await db.$transaction(async (tx) => {
      await assignDefaultRolePermissions(tx, roles);
    });

    const members = await db.sellerMember.findMany({
      where: { sellerId: seller.id },
      select: { userId: true },
    });
    for (const member of members) {
      await redis.del(RedisKeys.userPermissions(member.userId, seller.id));
    }

    fixed++;
    logger.info(`Fixed permissions for seller ${seller.id} (${roles.length} roles)`);
  }

  logger.info(`Done. Fixed ${fixed} sellers.`);
  process.exit(0);
}

fixPermissions().catch((err) => {
  logger.error({ err: err.message }, "Fix failed");
  process.exit(1);
});
