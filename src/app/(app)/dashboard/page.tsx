import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const where = user?.role === "admin" ? {} : user?.role === "leader" ? { leaderId: user.id } : { assignedStaffId: user?.id };

  const [total, withoutAssignee, withStatus, latest] = await Promise.all([
    db.phoneRecord.count({ where }),
    db.phoneRecord.count({ where: { ...where, assignedStaffId: null } }),
    db.phoneRecord.count({ where: { ...where, statusText: { not: null } } }),
    db.phoneRecord.findMany({ where, take: 5, orderBy: { updatedAt: "desc" }, include: { assignedStaff: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan" description="Snapshot nhanh tình hình dữ liệu số điện thoại." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng số record" value={total} />
        <StatCard label="Chưa phân công" value={withoutAssignee} />
        <StatCard label="Đã có status" value={withStatus} />
      </div>
      <Card>
        <div className="mb-4 text-lg font-semibold">Cập nhật gần đây</div>
        <div className="space-y-3">
          {latest.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="font-mono text-sm font-semibold">{item.phoneLast9}</div>
              <div className="mt-1 text-sm text-slate-600">{item.statusText || "Chưa có status"} · {item.assignedStaff?.name || "Chưa gán nhân viên"}</div>
            </div>
          ))}
          {latest.length === 0 ? <div className="text-sm text-slate-500">Chưa có dữ liệu.</div> : null}
        </div>
      </Card>
    </div>
  );
}
