import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.importDuplicate.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.phoneRecord.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);
  const leaderPassword = await bcrypt.hash("leader123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      role: UserRole.admin,
      passwordHash,
    },
  });

  const leader = await prisma.user.create({
    data: {
      username: "leader1",
      role: UserRole.leader,
      passwordHash: leaderPassword,
    },
  });

  const staffA = await prisma.user.create({
    data: {
      username: "staffa",
      role: UserRole.staff,
      teamLeaderId: leader.id,
      passwordHash: staffPassword,
    },
  });

  const staffB = await prisma.user.create({
    data: {
      username: "staffb",
      role: UserRole.staff,
      teamLeaderId: leader.id,
      passwordHash: staffPassword,
    },
  });

  await prisma.phoneRecord.createMany({
    data: [
      {
        phoneRaw: "0912345678",
        phoneLast9: "912345678",
        statusText: "Không nghe máy",
        noteText: "Gọi lại sau 15h",
        assignedStaffId: staffA.id,
        leaderId: leader.id,
        createdById: admin.id,
        updatedById: admin.id,
      },
      {
        phoneRaw: "+84987654321",
        phoneLast9: "987654321",
        statusText: "Quan tâm",
        noteText: "Xin báo giá qua Zalo",
        assignedStaffId: staffB.id,
        leaderId: leader.id,
        createdById: leader.id,
        updatedById: leader.id,
      },
      {
        phoneRaw: "0901111222",
        phoneLast9: "901111222",
        statusText: null,
        noteText: null,
        assignedStaffId: null,
        leaderId: leader.id,
        createdById: leader.id,
        updatedById: leader.id,
      },
    ],
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
