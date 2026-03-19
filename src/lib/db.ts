import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Per-connection SQLite pragmas (WAL is set persistently by db:prepare)
  client.$queryRawUnsafe("PRAGMA synchronous = NORMAL").catch(() => {});
  client.$queryRawUnsafe("PRAGMA cache_size = -64000").catch(() => {});
  client.$queryRawUnsafe("PRAGMA busy_timeout = 15000").catch(() => {});
  client.$queryRawUnsafe("PRAGMA temp_store = MEMORY").catch(() => {});
  client.$queryRawUnsafe("PRAGMA mmap_size = 268435456").catch(() => {});

  return client;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
