import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PhoneRecordsClient } from "./phone-records-client";

export default async function PhoneRecordsPage() {
  const user = await getSessionUser();
  const where = user?.role === "admin" ? {} : user?.role === "leader" ? { leaderId: user.id } : { assignedStaffId: user?.id };

  const [recordsRaw, staffOptions] = await Promise.all([
    db.phoneRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedStaff: { select: { id: true, name: true, role: true } },
        leader: { select: { id: true, name: true, role: true } },
      },
    }),
    db.user.findMany({ where: { role: "staff", isActive: true }, select: { id: true, name: true, role: true } }),
  ]);

  const records = recordsRaw.map((item) => ({
    ...item,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Số điện thoại" description="Quản lý record, cập nhật status, ghi chú và phân công nhân viên." />
      <PhoneRecordsClient initialRecords={records} staffOptions={staffOptions} canAssign={user?.role === "admin" || user?.role === "leader"} />
    </div>
  );
}
