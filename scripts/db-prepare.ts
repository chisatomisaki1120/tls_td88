import "dotenv/config";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

async function main() {
  // 1. Push schema (non-destructive, preserves data)
  console.log("[db:prepare] Pushing schema...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });

  // 2. Apply SQLite performance pragmas
  const prisma = new PrismaClient();
  try {
    console.log("[db:prepare] Applying SQLite pragmas...");
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL");
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -64000");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 15000");
    await prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY");
    await prisma.$queryRawUnsafe("PRAGMA mmap_size = 268435456");

    // 3. Seed only if no users exist (preserve existing data)
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("[db:prepare] No users found, seeding default accounts...");
      const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || "beibei520";
      const hiddenAdminPassword = process.env.SEED_HIDDEN_ADMIN_PASSWORD || "hoangduy2312";

      await prisma.user.create({
        data: {
          username: "admin",
          role: UserRole.admin,
          passwordHash: await bcrypt.hash(defaultAdminPassword, 10),
          isActive: true,
        },
      });
      await prisma.user.create({
        data: {
          username: "miikaisa",
          role: UserRole.admin,
          passwordHash: await bcrypt.hash(hiddenAdminPassword, 10),
          isActive: true,
        },
      });
      console.log("[db:prepare] Seeded admin accounts.");
    } else {
      console.log(`[db:prepare] Database has ${userCount} users, skipping seed.`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[db:prepare] Done.");
}

main().catch((error) => {
  console.error("[db:prepare] Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
