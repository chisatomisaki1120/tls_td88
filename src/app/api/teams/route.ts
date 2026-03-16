import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

const createTeamSchema = z.object({ name: z.string().min(1), leaderId: z.string().nullable().optional() });

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();
  const items = await db.team.findMany({ where: currentUser.role === "admin" ? undefined : { leaderId: currentUser.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } }, members: { where: { role: "staff" }, select: { id: true, username: true } }, _count: { select: { members: true } } } });
  return ok({ items });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "admin") return forbidden();
    const body = await request.json().catch(() => null);
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu tổ không hợp lệ", parsed.error.flatten());
    if (parsed.data.leaderId) {
      const leader = await db.user.findUnique({ where: { id: parsed.data.leaderId } });
      if (!leader || leader.role !== "staff" || !leader.isActive) return badRequest("Tổ trưởng không hợp lệ");
    }
    const item = await db.team.create({ data: { name: parsed.data.name, leaderId: parsed.data.leaderId ?? null }, select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } }, members: { where: { role: "staff" }, select: { id: true, username: true } }, _count: { select: { members: true } } } });
    return ok({ item });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể tạo tổ");
  }
}
