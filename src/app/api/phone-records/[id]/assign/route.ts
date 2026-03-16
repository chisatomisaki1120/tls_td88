import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canAccessRecord, canAssignRecord } from "@/lib/permissions";

const schema = z.object({ assignedStaffId: z.string().nullable() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser || !canAssignRecord(currentUser.role)) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dữ liệu phân công không hợp lệ", parsed.error.flatten());

  const { id } = await params;
  const existing = await db.phoneRecord.findUnique({ where: { id } });
  if (!existing) return notFound("Không tìm thấy record");
  if (!canAccessRecord(currentUser.role, currentUser.id, existing)) return forbidden();

  if (parsed.data.assignedStaffId) {
    const staff = await db.user.findUnique({ where: { id: parsed.data.assignedStaffId } });
    if (!staff || staff.role !== "staff") return badRequest("Nhân viên không hợp lệ");
  }

  const item = await db.phoneRecord.update({
    where: { id },
    data: {
      assignedStaffId: parsed.data.assignedStaffId,
      leaderId: currentUser.role === "leader" ? currentUser.id : existing.leaderId,
      updatedById: currentUser.id,
    },
    include: { assignedStaff: true, leader: true },
  });

  return ok({ item });
}
