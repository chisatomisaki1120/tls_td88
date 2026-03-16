import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "admin") return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dữ liệu không hợp lệ", parsed.error.flatten());

  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return notFound("Không tìm thấy user");
  if (existing.role === "admin") return badRequest("Không khóa admin duy nhất");

  const updated = await db.user.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true },
  });

  return ok({ item: updated });
}
