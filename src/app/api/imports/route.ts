import { getSessionUser } from "@/lib/auth";
import { forbidden, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/permissions";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();

  let where = {};
  if (currentUser.role !== "admin") {
    const teamMembers = await db.user.findMany({
      where: { team: { leaderId: currentUser.id } },
      select: { id: true },
    });
    const memberIds = teamMembers.map((m) => m.id);
    where = { OR: [{ importedByUserId: currentUser.id }, ...(memberIds.length > 0 ? [{ assignedStaffId: { in: memberIds } }] : [])] };
  }

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
