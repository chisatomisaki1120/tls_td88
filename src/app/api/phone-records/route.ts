import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { normalizePhoneToLast9 } from "@/lib/phone";
import { buildPhoneRecordScope, canAssignRecord } from "@/lib/permissions";

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
  const page = Math.max(Number(request.nextUrl.searchParams.get("page") || 1), 1);
  const requestedPageSize = Number(request.nextUrl.searchParams.get("pageSize") || 50);
  const pageSize = Math.min(Math.max(requestedPageSize, 1), 50);

  const baseWhere = {
    ...(q
      ? {
          OR: [
            { phoneLast9: { contains: q } },
            { phoneRaw: { contains: q } },
          ],
        }
      : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
    ...(status ? { statusText: status } : {}),
  };

  const where = {
    AND: [baseWhere, buildPhoneRecordScope(currentUser)],
  };

  const [total, items] = await Promise.all([
    db.phoneRecord.count({ where }),
    db.phoneRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedStaff: { select: { id: true, username: true, role: true, teamLeaderId: true } },
        leader: { select: { id: true, username: true, role: true } },
      },
    }),
  ]);

  return ok({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
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

    if (!(await canAssignRecord(currentUser.role, currentUser.id, parsed.data.assignedStaffId ?? null))) {
      return badRequest("Không thể gán data cho nhân viên ngoài team");
    }

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
