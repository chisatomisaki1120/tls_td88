import type { Prisma, UserRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function canManageUsers(role: UserRole) {
  return role === "admin";
}

export async function canAccessRecord(
  role: UserRole,
  userId: string,
  record: { leaderId: string | null; assignedStaffId: string | null },
) {
  if (role === "admin") return true;
  if (role === "staff") return record.assignedStaffId === userId;

  if (record.leaderId === userId) return true;
  if (!record.assignedStaffId) return false;

  const staff = await db.user.findUnique({
    where: { id: record.assignedStaffId },
    select: { teamLeaderId: true },
  });

  return staff?.teamLeaderId === userId;
}

export async function canAssignRecord(role: UserRole, userId?: string, assignedStaffId?: string | null) {
  if (role === "admin") return true;
  if (role !== "leader" || !userId) return false;
  if (!assignedStaffId) return true;

  const staff = await db.user.findUnique({
    where: { id: assignedStaffId },
    select: { role: true, teamLeaderId: true, isActive: true },
  });

  return !!staff && staff.role === "staff" && staff.isActive && staff.teamLeaderId === userId;
}

export function buildPhoneRecordScope(user: { role: UserRole; id: string }): Prisma.PhoneRecordWhereInput {
  if (user.role === "admin") return {};
  if (user.role === "staff") return { assignedStaffId: user.id };

  return {
    OR: [
      { leaderId: user.id },
      { assignedStaff: { is: { teamLeaderId: user.id } } },
    ],
  };
}

export function buildStaffScope(user: { role: UserRole; id: string }): Prisma.UserWhereInput {
  if (user.role === "admin") {
    return { role: "staff" };
  }

  return {
    role: "staff",
    teamLeaderId: user.id,
  };
}
