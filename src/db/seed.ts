import { db } from "./index";
import { logger } from "../utils/logger";
import bcrypt from "bcryptjs";
import { seedPlatformPermissions } from "../lib/permission/permission.service";

async function seed() {
  logger.info("Running seed...");

  const existing = await db.platformMember.findFirst({
    include: { role: true },
    where: { role: { name: "super_admin" } },
  });

  if (existing) {
    logger.info("super_admin already exists  skipping");
    process.exit(0);
  }

  const password = await bcrypt.hash("Admin@123456", 12);

  await db.$transaction(async (tx) => {
    await seedPlatformPermissions(tx);

    const role = await tx.platformRole.upsert({
      where: { name: "super_admin" },
      update: {},
      create: { name: "super_admin", description: "Full platform access" },
    });

    await tx.platformRole.upsert({
      where: { name: "onboarding_manager" },
      update: {},
      create: {
        name: "onboarding_manager",
        description: "Manages seller onboarding",
      },
    });

    await tx.platformRole.upsert({
      where: { name: "product_reviewer" },
      update: {},
      create: {
        name: "product_reviewer",
        description: "Reviews and approves products",
      },
    });

    const user = await tx.user.create({
      data: {
        name: "Super Admin",
        email: "admin@etradebazaar.com",
        password,
      },
    });

    await tx.platformMember.create({
      data: { userId: user.id, roleId: role.id },
    });

    logger.info(
      "super_admin created  email: admin@etradebazaar.com, password: Admin@123456",
    );
  });

  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err: err.message }, "Seed failed");
  process.exit(1);
});