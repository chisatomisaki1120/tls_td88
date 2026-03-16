import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { hashPassword, getSessionUser } from "@/lib/auth";

const createUserSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(6),
  employeeCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(["leader", "staff"]),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return forbidden();
  if (user.role !== "admin") return forbidden();

  const q = request.nextUrl.searchParams.get("q") || "";
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { username: { contains: q } },
            { employeeCode: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, username: true, role: true, employeeCode: true, phone: true, isActive: true, createdAt: true },
  });
  return ok({ items: users });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu user không hợp lệ", parsed.error.flatten());

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await db.user.create({
      data: {
        ...parsed.data,
        passwordHash,
      },
      select: { id: true, name: true, username: true, role: true, employeeCode: true, phone: true, isActive: true },
    });

    return ok({ item: created });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể tạo user");
  }
}
