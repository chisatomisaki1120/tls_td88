import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { badRequest, ok, unauthorized } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Dữ liệu đăng nhập không hợp lệ", parsed.error.flatten());
  }

  const user = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.isActive) {
    return unauthorized();
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return unauthorized();
  }

  await createSession({ sub: user.id, username: user.username, role: user.role });

  return ok({ user: { id: user.id, username: user.username, role: user.role } });
}
