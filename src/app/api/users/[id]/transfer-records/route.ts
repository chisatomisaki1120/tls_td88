import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({ targetStaffId: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) return forbidden();

    const currentUserTeam = currentUser.role === "admin" ? null : await db.team.findFirst({ where: { leaderId: currentUser.id }, select: { id: true } });
    if (currentUser.role !== "admin" && !currentUserTeam) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu chuyển không hợp lệ", parsed.error.flatten());

    const { id } = await params;
    if (id === parsed.data.targetStaffId) return badRequest("Không thể chuyển cho chính nhân viên này");

    const sourceUser = await db.user.findUnique({ where: { id }, include: { team: true, leadingTeam: { select: { id: true } } } });
    if (!sourceUser) return notFound("Không tìm thấy nhân viên nguồn");
    if (sourceUser.role !== "staff") return badRequest("Chỉ hỗ trợ chuyển dữ liệu của nhân viên");

    const targetUser = await db.user.findUnique({ where: { id: parsed.data.targetStaffId }, include: { team: true, leadingTeam: { select: { id: true } } } });
    if (!targetUser) return notFound("Không tìm thấy nhân viên đích");
    if (targetUser.role !== "staff" || !targetUser.isActive) return badRequest("Nhân viên đích không hợp lệ");

    const sourceLeaderId = sourceUser.team?.leaderId || (sourceUser.leadingTeam ? sourceUser.id : null);
    const targetLeaderId = targetUser.team?.leaderId || (targetUser.leadingTeam ? targetUser.id : null);

    if (currentUser.role !== "admin") {
      if (sourceLeaderId !== currentUser.id || targetLeaderId !== currentUser.id) return forbidden();
    }

    const moved = await db.phoneRecord.updateMany({
      where: { assignedStaffId: sourceUser.id },
      data: { assignedStaffId: targetUser.id, leaderId: targetLeaderId || sourceLeaderId || null, updatedById: currentUser.id },
    });

    return ok({ movedCount: moved.count });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể chuyển dữ liệu");
  }
}
