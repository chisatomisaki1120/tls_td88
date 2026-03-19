import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildPhoneRecordScope, isTeamLeader } from "@/lib/permissions";

function RecentRecordItem({
  phoneLast9,
  statusText,
  assignedStaffName,
}: {
  phoneLast9: string;
  statusText: string | null;
  assignedStaffName: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
      <div className="font-mono text-sm font-semibold">{phoneLast9}</div>
      <div className="mt-1 text-sm text-slate-600">
        {statusText || "Chưa có status"} · {assignedStaffName || "Chưa gán nhân viên"}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const scope = user ? await buildPhoneRecordScope(user) : { id: "__never__" };
  const where = { AND: [scope] };
  const leaderView = user ? await isTeamLeader(user.id) : false;
  const recentTitle = !leaderView && user?.role === "staff" ? "Danh sách data của bạn" : "Cập nhật gần đây";

  const [total, withoutAssignee, withStatus, latest] = await Promise.all([
    db.phoneRecord.count({ where }),
    db.phoneRecord.count({ where: { AND: [scope, { assignedStaffId: null }] } }),
    db.phoneRecord.count({ where: { AND: [scope, { statusText: { not: null } }] } }),
    db.phoneRecord.findMany({
      where,
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        phoneLast9: true,
        statusText: true,
        assignedStaff: { select: { username: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng số record" value={total} />
        <StatCard label="Chưa phân công" value={withoutAssignee} />
        <StatCard label="Đã có status" value={withStatus} />
      </div>

      <Card>
        <div className="mb-4 text-lg font-semibold">{recentTitle}</div>
        <div className="space-y-3">
          {latest.map((item) => (
            <RecentRecordItem
              key={item.id}
              phoneLast9={item.phoneLast9}
              statusText={item.statusText}
              assignedStaffName={item.assignedStaff?.username || null}
            />
          ))}
          {latest.length === 0 ? <div className="text-sm text-slate-500">Chưa có dữ liệu.</div> : null}
        </div>
      </Card>
    </div>
  );
}
