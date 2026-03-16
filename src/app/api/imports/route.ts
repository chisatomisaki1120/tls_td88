import { getSessionUser } from "@/lib/auth";
import { forbidden, ok } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role === "staff") return forbidden();

  const where =
    currentUser.role === "admin"
      ? {}
      : {
          OR: [
            { importedByUserId: currentUser.id },
            { assignedStaff: { is: { teamLeaderId: currentUser.id } } },
          ],
        };
  const items = await db.importJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignedStaff: { select: { id: true, username: true, role: true } },
      importedBy: { select: { id: true, username: true, role: true } },
      duplicates: { orderBy: { rowNumber: "asc" } },
    },
  });

  return ok({ items });
}
