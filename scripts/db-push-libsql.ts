import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@libsql/client";
import { getDatabaseUrl, getTursoAuthToken, isLibsqlUrl } from "../src/lib/db";

function assertLibsqlEnv() {
  const url = getDatabaseUrl();
  if (!isLibsqlUrl(url)) {
    throw new Error(`This script only supports Turso/libSQL. Current DATABASE_URL: ${url}`);
  }
  if (!getTursoAuthToken()) {
    throw new Error("Missing TURSO_AUTH_TOKEN in environment.");
  }
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part};`);
}

async function main() {
  assertLibsqlEnv();

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const sql = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`, {
    encoding: "utf8",
  });

  const statements = splitSqlStatements(sql).filter((statement) => !/^PRAGMA\s+/i.test(statement));
  const client = createClient({
    url: getDatabaseUrl(),
    authToken: getTursoAuthToken(),
  });

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message) || /duplicate column name/i.test(message) || /duplicate index/i.test(message)) {
        console.warn(`[db:push:libsql] Skip: ${message}`);
        continue;
      }
      throw error;
    }
  }

  client.close();
  console.log(`Schema applied to Turso/libSQL: ${getDatabaseUrl()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
