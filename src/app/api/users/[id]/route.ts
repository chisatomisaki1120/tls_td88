import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser, hashPassword } from "@/lib/auth";

const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  role: z.enum(["leader", "staff"]).optional(),
  password: z.string().min(6).optional(),
  teamLeaderId: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "leader")) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu cập nhật không hợp lệ", parsed.error.flatten());

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không chỉnh sửa admin tại màn này");

    if (currentUser.role === "leader") {
      if (existing.role !== "staff" || existing.teamLeaderId !== currentUser.id) {
        return forbidden();
      }
      if (parsed.data.role && parsed.data.role !== "staff") {
        return badRequest("Leader chỉ được chỉnh sửa staff thuộc team mình");
      }
    }

    const nextRole = parsed.data.role ?? existing.role;
    const nextTeamLeaderId =
      currentUser.role === "leader"
        ? currentUser.id
        : nextRole === "staff"
          ? parsed.data.teamLeaderId ?? existing.teamLeaderId
          : null;

    if (nextRole === "staff") {
      if (!nextTeamLeaderId) return badRequest("Staff phải thuộc một leader");
      const leader = await db.user.findUnique({ where: { id: nextTeamLeaderId } });
      if (!leader || leader.role !== "leader") return badRequest("Leader không hợp lệ");
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        username: parsed.data.username,
        role: nextRole,
        teamLeaderId: nextTeamLeaderId,
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        teamLeaderId: true,
        teamLeader: { select: { id: true, username: true } },
      },
    });

    return ok({ item: updated });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể cập nhật user");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "leader")) return forbidden();

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không được xóa admin");

    if (currentUser.role === "leader") {
      if (existing.role !== "staff" || existing.teamLeaderId !== currentUser.id) {
        return forbidden();
      }
    }

    const recordCount = await db.phoneRecord.count({
      where: {
        OR: [
          { assignedStaffId: id },
          { leaderId: id },
          { createdById: id },
          { updatedById: id },
        ],
      },
    });

    const teamMemberCount = existing.role === "leader" ? await db.user.count({ where: { teamLeaderId: id } }) : 0;

    if (recordCount > 0 || teamMemberCount > 0) {
      return badRequest("Không thể xóa user đang liên kết với dữ liệu hoặc team");
    }

    await db.importJob.deleteMany({ where: { OR: [{ importedByUserId: id }, { assignedStaffId: id }] } });
    await db.user.delete({ where: { id } });

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể xóa user");
  }
}
