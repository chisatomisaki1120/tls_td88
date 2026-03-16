import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const updateTeamSchema = z.object({ name: z.string().min(1).optional(), leaderId: z.string().nullable().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "admin") return forbidden();
    const body = await request.json().catch(() => null);
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu cập nhật tổ không hợp lệ", parsed.error.flatten());
    const { id } = await params;
    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy tổ");
    if (parsed.data.leaderId) {
      const leader = await db.user.findUnique({ where: { id: parsed.data.leaderId } });
      if (!leader || leader.role !== "staff" || !leader.isActive) return badRequest("Tổ trưởng không hợp lệ");
    }
    const item = await db.team.update({ where: { id }, data: { name: parsed.data.name, leaderId: parsed.data.leaderId }, select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } }, members: { where: { role: "staff" }, select: { id: true, username: true } }, _count: { select: { members: true } } } });
    return ok({ item });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể cập nhật tổ");
  }
}
