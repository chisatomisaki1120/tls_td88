import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function cleanEnvValue(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  return raw ? cleanEnvValue(raw) : "file:./dev.db";
}

function getTursoAuthToken() {
  const raw = process.env.TURSO_AUTH_TOKEN;
  return raw ? cleanEnvValue(raw) : undefined;
}

function isLibsqlUrl(url: string) {
  return /^(libsql|https?):\/\//i.test(url);
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl();

  return new PrismaClient({
    adapter: isLibsqlUrl(databaseUrl)
      ? new PrismaLibSQL({
          url: databaseUrl,
          authToken: getTursoAuthToken(),
        })
      : null,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export { getDatabaseUrl, getTursoAuthToken, isLibsqlUrl };
