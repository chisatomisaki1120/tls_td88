import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser, hashPassword } from "@/lib/auth";

const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  role: z.enum(["leader", "staff"]).optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "admin") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu cập nhật không hợp lệ", parsed.error.flatten());

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không chỉnh sửa admin tại màn này");

    const updated = await db.user.update({
      where: { id },
      data: {
        username: parsed.data.username,
        role: parsed.data.role,
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
      select: { id: true, username: true, role: true, isActive: true },
    });

    return ok({ item: updated });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể cập nhật user");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "admin") return forbidden();

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy user");
    if (existing.role === "admin") return badRequest("Không được xóa admin");

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

    if (recordCount > 0) {
      return badRequest("Không thể xóa user đang liên kết với dữ liệu số điện thoại");
    }

    await db.importJob.deleteMany({ where: { OR: [{ importedByUserId: id }, { assignedStaffId: id }] } });
    await db.user.delete({ where: { id } });

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể xóa user");
  }
}
