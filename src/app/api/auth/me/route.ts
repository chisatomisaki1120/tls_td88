import { ok, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return ok({ user });
}
