import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.importDuplicate.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.phoneRecord.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.create({ data: { username: "admin", role: UserRole.admin, passwordHash: adminPassword } });
  const leaderStaff = await prisma.user.create({ data: { username: "leader1", role: UserRole.staff, passwordHash: staffPassword } });
  const team = await prisma.team.create({ data: { name: "Tổ 1", leaderId: leaderStaff.id } });
  const staffA = await prisma.user.create({ data: { username: "staffa", role: UserRole.staff, teamId: team.id, passwordHash: staffPassword } });
  const staffB = await prisma.user.create({ data: { username: "staffb", role: UserRole.staff, teamId: team.id, passwordHash: staffPassword } });

  await prisma.phoneRecord.createMany({
    data: [
      { phoneRaw: "0912345678", phoneLast9: "912345678", statusText: "Không nghe máy", noteText: "Gọi lại sau 15h", assignedStaffId: staffA.id, leaderId: leaderStaff.id, createdById: admin.id, updatedById: admin.id },
      { phoneRaw: "+84987654321", phoneLast9: "987654321", statusText: "Quan tâm", noteText: "Xin báo giá qua Zalo", assignedStaffId: staffB.id, leaderId: leaderStaff.id, createdById: leaderStaff.id, updatedById: leaderStaff.id },
      { phoneRaw: "0901111222", phoneLast9: "901111222", statusText: null, noteText: null, assignedStaffId: null, leaderId: leaderStaff.id, createdById: leaderStaff.id, updatedById: leaderStaff.id },
    ],
  });
}

main().then(async () => { await prisma.$disconnect(); }).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
