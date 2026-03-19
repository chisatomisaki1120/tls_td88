import { getSessionUser } from "@/lib/auth";
import { forbidden, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/permissions";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();

  const where = currentUser.role === "admin" ? {} : { OR: [{ importedByUserId: currentUser.id }, { assignedStaff: { is: { team: { is: { leaderId: currentUser.id } } } } }] };
  const items = await db.importJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      assignedStaff: { select: { id: true, username: true, role: true } },
      importedBy: { select: { id: true, username: true, role: true } },
    },
  });

  return ok({ items });
}
