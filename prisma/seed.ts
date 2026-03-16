import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.phoneRecord.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);
  const leaderPassword = await bcrypt.hash("leader123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      username: "admin",
      role: UserRole.admin,
      employeeCode: "ADM001",
      passwordHash,
      phone: "0900000000",
    },
  });

  const leader = await prisma.user.create({
    data: {
      name: "Leader 1",
      username: "leader1",
      role: UserRole.leader,
      employeeCode: "LDR001",
      passwordHash: leaderPassword,
      phone: "0911111111",
    },
  });

  const staffA = await prisma.user.create({
    data: {
      name: "Nguyen Van A",
      username: "staffa",
      role: UserRole.staff,
      employeeCode: "STF001",
      passwordHash: staffPassword,
      phone: "0922222222",
    },
  });

  const staffB = await prisma.user.create({
    data: {
      name: "Tran Thi B",
      username: "staffb",
      role: UserRole.staff,
      employeeCode: "STF002",
      passwordHash: staffPassword,
      phone: "0933333333",
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
