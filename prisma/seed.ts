import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { getDatabaseUrl, getTursoAuthToken, isLibsqlUrl } from "../src/lib/db";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const databaseUrl = getDatabaseUrl();
const prisma = new PrismaClient({
  adapter: isLibsqlUrl(databaseUrl)
    ? new PrismaLibSQL({
        url: databaseUrl,
        authToken: getTursoAuthToken(),
      })
    : null,
});

async function main() {
  await prisma.importDuplicate.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.phoneRecord.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || "change-me";
  const hiddenAdminPassword = process.env.SEED_HIDDEN_ADMIN_PASSWORD || "change-me-too";

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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
