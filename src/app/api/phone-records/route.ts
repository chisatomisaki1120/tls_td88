import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { normalizePhoneToLast9 } from "@/lib/phone";

const createSchema = z.object({
  phoneRaw: z.string().min(1),
  statusText: z.string().nullable().optional(),
  noteText: z.string().nullable().optional(),
  assignedStaffId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) return forbidden();

  const q = request.nextUrl.searchParams.get("q") || "";
  const assignedStaffId = request.nextUrl.searchParams.get("assignedStaffId") || "";
  const status = request.nextUrl.searchParams.get("status") || "";

  const where = {
    ...(currentUser.role === "leader" ? { leaderId: currentUser.id } : {}),
    ...(currentUser.role === "staff" ? { assignedStaffId: currentUser.id } : {}),
    ...(q ? { phoneLast9: { contains: q } } : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
    ...(status ? { statusText: status } : {}),
  };

  const items = await db.phoneRecord.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      assignedStaff: { select: { id: true, name: true, role: true } },
      leader: { select: { id: true, name: true, role: true } },
    },
  });

  return ok({ items, pagination: { page: 1, pageSize: items.length, total: items.length } });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "leader")) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu record không hợp lệ", parsed.error.flatten());

    const phoneLast9 = normalizePhoneToLast9(parsed.data.phoneRaw);
    if (!phoneLast9) return badRequest("Số điện thoại không hợp lệ");

    const created = await db.phoneRecord.create({
      data: {
        phoneRaw: parsed.data.phoneRaw,
        phoneLast9,
        statusText: parsed.data.statusText,
        noteText: parsed.data.noteText,
        assignedStaffId: parsed.data.assignedStaffId,
        leaderId: currentUser.role === "leader" ? currentUser.id : null,
        createdById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return ok({ item: created });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể tạo record");
  }
}
