import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { canAccessRecord } from "@/lib/permissions";

const schema = z.object({ statusText: z.string().nullable() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Status không hợp lệ", parsed.error.flatten());

  const { id } = await params;
  const existing = await db.phoneRecord.findUnique({ where: { id } });
  if (!existing) return notFound("Không tìm thấy record");
  if (!canAccessRecord(currentUser.role, currentUser.id, existing)) return forbidden();

  const item = await db.phoneRecord.update({
    where: { id },
    data: { statusText: parsed.data.statusText, updatedById: currentUser.id },
    include: { assignedStaff: true, leader: true },
  });

  return ok({ item });
}
