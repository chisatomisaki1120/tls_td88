import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { findLeadingTeam, resolveTeamLeadIdForUser } from "@/lib/team";

const schema = z.object({ targetStaffId: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) return forbidden();

    const currentUserTeam = currentUser.role === "admin" ? null : await findLeadingTeam(currentUser.id);
    if (currentUser.role !== "admin" && !currentUserTeam) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu chuyển không hợp lệ", parsed.error.flatten());

    const { id } = await params;
    if (id === parsed.data.targetStaffId) return badRequest("Không thể chuyển cho chính nhân viên này");

    const sourceUser = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!sourceUser) return notFound("Không tìm thấy nhân viên nguồn");
    if (sourceUser.role !== "staff") return badRequest("Chỉ hỗ trợ chuyển dữ liệu của nhân viên");

    const targetUser = await db.user.findUnique({ where: { id: parsed.data.targetStaffId }, select: { id: true, role: true, isActive: true } });
    if (!targetUser) return notFound("Không tìm thấy nhân viên đích");
    if (targetUser.role !== "staff" || !targetUser.isActive) return badRequest("Nhân viên đích không hợp lệ");

    const [sourceTeamLeadId, targetTeamLeadId] = await Promise.all([
      resolveTeamLeadIdForUser(sourceUser.id),
      resolveTeamLeadIdForUser(targetUser.id),
    ]);

    if (currentUser.role !== "admin") {
      if (sourceTeamLeadId !== currentUser.id || targetTeamLeadId !== currentUser.id) return forbidden();
    }

    const moved = await db.$transaction(async (tx) => {
      return tx.phoneRecord.updateMany({
        where: { assignedStaffId: sourceUser.id },
        data: {
          assignedStaffId: targetUser.id,
          leaderId: targetTeamLeadId || sourceTeamLeadId || null,
          updatedById: currentUser.id,
        },
      });
    });

    return ok({ movedCount: moved.count });
  } catch (error) {
    return serverError("Không thể chuyển dữ liệu");
  }
}
