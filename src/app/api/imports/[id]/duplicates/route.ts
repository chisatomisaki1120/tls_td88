import { getSessionUser } from "@/lib/auth";
import { forbidden, notFound, ok } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getSessionUser();
  if (!currentUser) return forbidden();

  const { id } = await params;
  const job = await db.importJob.findUnique({ where: { id } });
  if (!job) return notFound("Không tìm thấy import job");
  if (currentUser.role !== "admin" && job.importedByUserId !== currentUser.id) return forbidden();

  const items = await db.importDuplicate.findMany({ where: { importJobId: id }, orderBy: { rowNumber: "asc" } });
  return ok({ items });
}
