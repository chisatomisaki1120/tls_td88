import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { findLeadingTeam, userSummarySelect, withRecordCount } from "@/lib/team";

const updateUserSchema = z.object({ username: z.string().min(1).optional(), password: z.string().min(6).optional(), teamId: z.string().nullable().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu cập nhật không hợp lệ", parsed.error.flatten());

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id }, include: { team: true } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không chỉnh sửa admin tại màn này");

    if (currentUser.role !== "admin") {
      const myTeam = await findLeadingTeam(currentUser.id);
      if (!myTeam || existing.teamId !== myTeam.id) return forbidden();
    }

    const nextTeamId = parsed.data.teamId ?? existing.teamId ?? null;
    if (nextTeamId) {
      const team = await db.team.findUnique({ where: { id: nextTeamId }, select: { leaderId: true } });
      if (!team) return badRequest("Tổ không hợp lệ");
      if (currentUser.role !== "admin" && team.leaderId !== currentUser.id) return forbidden();
    }

    const updated = await db.$transaction(async (tx) => {
      const teamChanged = existing.teamId !== nextTeamId;
      if (teamChanged && existing.teamId) {
        await tx.phoneRecord.updateMany({
          where: { assignedStaffId: id },
          data: {
            assignedStaffId: null,
            leaderId: existing.team?.leaderId || null,
            updatedById: currentUser.id,
          },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          username: parsed.data.username,
          teamId: nextTeamId,
          ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
        },
        select: userSummarySelect,
      });
    });

    return ok({ item: withRecordCount(updated) });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể cập nhật user");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();
    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không được xóa admin");
    if (currentUser.role !== "admin") {
      const myTeam = await findLeadingTeam(currentUser.id);
      if (!myTeam || existing.teamId !== myTeam.id) return forbidden();
    }
    const recordCount = await db.phoneRecord.count({ where: { OR: [{ assignedStaffId: id }, { leaderId: id }, { createdById: id }, { updatedById: id }] } });
    const teamLeaderCount = await db.team.count({ where: { leaderId: id } });
    if (recordCount > 0 || teamLeaderCount > 0) return badRequest("Không thể xóa user đang liên kết với dữ liệu hoặc tổ");
    await db.importJob.deleteMany({ where: { OR: [{ importedByUserId: id }, { assignedStaffId: id }] } });
    await db.user.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể xóa user");
  }
}
