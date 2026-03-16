import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canAccessRecord } from "@/lib/permissions";

const patchSchema = z.object({
  statusText: z.string().nullable().optional(),
  noteText: z.string().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser) return forbidden();
  const { id } = await params;
  const item = await db.phoneRecord.findUnique({ where: { id }, include: { assignedStaff: true, leader: true } });
  if (!item) return notFound("Không tìm thấy record");
  if (!(await canAccessRecord(currentUser.role, currentUser.id, item))) return forbidden();
  return ok({ item });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) return forbidden();
    const { id } = await params;
    const existing = await db.phoneRecord.findUnique({ where: { id } });
    if (!existing) return notFound("Không tìm thấy record");
    if (!(await canAccessRecord(currentUser.role, currentUser.id, existing))) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu cập nhật không hợp lệ", parsed.error.flatten());

    const item = await db.phoneRecord.update({
      where: { id },
      data: {
        statusText: parsed.data.statusText,
        noteText: parsed.data.noteText,
        updatedById: currentUser.id,
      },
      include: { assignedStaff: true, leader: true },
    });

    return ok({ item });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể cập nhật record");
  }
}
