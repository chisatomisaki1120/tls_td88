import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { hashPassword, getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["leader", "staff"]),
  teamLeaderId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return forbidden();

  const q = request.nextUrl.searchParams.get("q") || "";
  let where: Prisma.UserWhereInput | undefined;

  if (user.role === "admin") {
    where = q ? { OR: [{ username: { contains: q } }] } : undefined;
  } else if (user.role === "leader") {
    where = {
      AND: [
        { role: "staff", teamLeaderId: user.id },
        ...(q ? [{ username: { contains: q } }] : []),
      ],
    };
  }

  if (user.role !== "admin" && user.role !== "leader") return forbidden();

  const users = await db.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      teamLeaderId: true,
      teamLeader: { select: { id: true, username: true } },
    },
  });
  return ok({ items: users });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "admin" && user.role !== "leader")) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dữ liệu user không hợp lệ", parsed.error.flatten());

    if (user.role === "leader" && parsed.data.role !== "staff") {
      return badRequest("Leader chỉ được tạo staff");
    }

    const teamLeaderId = user.role === "leader" ? user.id : parsed.data.role === "staff" ? parsed.data.teamLeaderId : null;

    if (parsed.data.role === "staff") {
      if (!teamLeaderId) return badRequest("Staff phải thuộc một leader");
      const leader = await db.user.findUnique({ where: { id: teamLeaderId } });
      if (!leader || leader.role !== "leader") return badRequest("Leader không hợp lệ");
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await db.user.create({
      data: {
        username: parsed.data.username,
        role: parsed.data.role,
        passwordHash,
        teamLeaderId: parsed.data.role === "staff" ? teamLeaderId : null,
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

    return ok({ item: created });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Không thể tạo user");
  }
}
