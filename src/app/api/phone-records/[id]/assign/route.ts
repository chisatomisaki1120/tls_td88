import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canAccessRecord, canAssignRecord } from "@/lib/permissions";

const schema = z.object({ assignedStaffId: z.string().nullable() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser || !(await canAssignRecord(currentUser.role, currentUser.id))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dữ liệu phân công không hợp lệ", parsed.error.flatten());

  const { id } = await params;
  const existing = await db.phoneRecord.findUnique({ where: { id } });
  if (!existing) return notFound("Không tìm thấy record");
  if (!(await canAccessRecord(currentUser.role, currentUser.id, existing))) return forbidden();

  if (!(await canAssignRecord(currentUser.role, currentUser.id, parsed.data.assignedStaffId))) {
    return badRequest("Không thể gán nhân viên ngoài team");
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
