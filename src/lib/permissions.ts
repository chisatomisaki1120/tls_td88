import type { Prisma, UserRole } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveTeamLeadIdForUser } from "@/lib/team";

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function isTeamLeader(userId: string) {
  const team = await db.team.findFirst({ where: { leaderId: userId }, select: { id: true } });
  return !!team;
}

export async function canManageUsers(role: UserRole, userId?: string) {
  if (role === "admin") return true;
  if (role !== "staff" || !userId) return false;
  return isTeamLeader(userId);
}

export async function canAccessRecord(role: UserRole, userId: string, record: { leaderId: string | null; assignedStaffId: string | null }) {
  if (role === "admin") return true;
  if (record.assignedStaffId === userId || record.leaderId === userId) return true;
  if (!record.assignedStaffId) return false;
  return (await resolveTeamLeadIdForUser(record.assignedStaffId)) === userId;
}

export async function canAssignRecord(role: UserRole, userId?: string, assignedStaffId?: string | null) {
  if (role === "admin") return true;
  if (role !== "staff" || !userId) return false;
  if (!(await isTeamLeader(userId))) return false;
  if (!assignedStaffId || assignedStaffId === userId) return true;

  const staff = await db.user.findUnique({
    where: { id: assignedStaffId },
    select: { role: true, isActive: true, team: { select: { leaderId: true } } },
  });

  return !!staff && staff.role === "staff" && staff.isActive && staff.team?.leaderId === userId;
}

export async function buildPhoneRecordScope(user: { role: UserRole; id: string }): Promise<Prisma.PhoneRecordWhereInput> {
  if (user.role === "admin") return {};
  if (!(await isTeamLeader(user.id))) return { assignedStaffId: user.id };
  return { OR: [{ leaderId: user.id }, { assignedStaff: { is: { team: { is: { leaderId: user.id } } } } }] };
}

export async function buildStaffScope(user: { role: UserRole; id: string }): Promise<Prisma.UserWhereInput> {
  if (user.role === "admin") return { role: "staff" };
  if (!(await isTeamLeader(user.id))) return { id: user.id };
  return { role: "staff", team: { is: { leaderId: user.id } } };
}
