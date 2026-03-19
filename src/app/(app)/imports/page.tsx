import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStaffScope, canManageUsers } from "@/lib/permissions";
import { ImportsClient } from "./imports-client";

export default async function ImportsPage() {
  const currentUser = await getSessionUser();
  if (!currentUser) redirect("/login");
  if (!(await canManageUsers(currentUser.role, currentUser.id))) redirect("/dashboard");

  const staffScope = await buildStaffScope(currentUser);
  const where = currentUser.role === "admin" ? {} : { OR: [{ importedByUserId: currentUser.id }, { assignedStaff: { is: { team: { is: { leaderId: currentUser.id } } } } }] };

  const [staffOptions, jobs] = await Promise.all([
    db.user.findMany({
      where: { AND: [staffScope, { isActive: true }] },
      select: { id: true, username: true, role: true },
    }),
    db.importJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        assignedStaff: { select: { id: true, username: true, role: true } },
        importedBy: { select: { id: true, username: true, role: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import dữ liệu"
      />

      <Card>
        <p className="text-sm text-slate-600">
          Quy tắc hiện tại: chỉ nhận file <strong>.xlsx</strong>, chỉ đọc <strong>cột A</strong>,
          bỏ bản ghi mới nếu trùng 9 số cuối với dữ liệu cũ hoặc trùng ngay trong cùng file.
        </p>
      </Card>

      <ImportsClient staffOptions={staffOptions} initialJobs={JSON.parse(JSON.stringify(jobs))} />
    </div>
  );
}
