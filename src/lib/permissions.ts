import type { UserRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";

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

export function canAccessRecord(
  role: UserRole,
  userId: string,
  record: { leaderId: string | null; assignedStaffId: string | null },
) {
  if (role === "admin") return true;
  if (role === "leader") return record.leaderId === userId;
  return record.assignedStaffId === userId;
}

export function canAssignRecord(role: UserRole) {
  return role === "admin" || role === "leader";
}
