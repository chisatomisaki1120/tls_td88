import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { hashPassword, getSessionUser } from "@/lib/auth";
import { buildStaffScope, canManageUsers } from "@/lib/permissions";

const createUserSchema = z.object({ username: z.string().min(1), password: z.string().min(6), teamId: z.string().nullable().optional() });

export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await canManageUsers(user.role, user.id))) return forbidden();
  const where = user.role === "admin" ? undefined : await buildStaffScope(user);
  const users = await db.user.findMany({ where, orderBy: [{ role: "asc" }, { createdAt: "desc" }], select: { id: true, username: true, role: true, isActive: true, teamId: true, team: { select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } } } }, _count: { select: { assignedRecords: true } } } });
  const teams = await db.team.findMany({ where: user.role === "admin" ? undefined : { leaderId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } }, members: { where: { role: "staff" }, select: { id: true, username: true } }, _count: { select: { members: true } } } });
  const leaders = await db.user.findMany({ where: user.role === "admin" ? { isActive: true, role: "staff" as const } : { id: user.id, isActive: true, role: "staff" as const }, select: { id: true, username: true }, orderBy: { username: "asc" } });
  return ok({ items: users.map((item) => ({ ...item, recordCount: item._count.assignedRecords })), teams, leaders });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !(await canManageUsers(user.role, user.id))) return forbidden();
    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu user không hợp lệ", parsed.error.flatten());
    const teamId = user.role === "admin" ? parsed.data.teamId ?? null : (await db.team.findFirst({ where: { leaderId: user.id }, select: { id: true } }))?.id ?? null;
    if (teamId) {
      const team = await db.team.findUnique({ where: { id: teamId }, select: { leaderId: true } });
      if (!team) return badRequest("Tổ không hợp lệ");
      if (user.role !== "admin" && team.leaderId !== user.id) return forbidden();
    }
    const created = await db.user.create({ data: { username: parsed.data.username, role: "staff", passwordHash: await hashPassword(parsed.data.password), teamId }, select: { id: true, username: true, role: true, isActive: true, teamId: true, team: { select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } } } }, _count: { select: { assignedRecords: true } } } });
    return ok({ item: { ...created, recordCount: created._count.assignedRecords } });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể tạo user");
  }
}
