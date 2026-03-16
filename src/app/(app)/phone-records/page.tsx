import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildPhoneRecordScope, buildStaffScope } from "@/lib/permissions";
import { PhoneRecordsClient } from "./phone-records-client";

const PAGE_SIZE = 50;

export default async function PhoneRecordsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string; status?: string; assignedStaffId?: string }>;
}) {
  const user = await getSessionUser();
  const params = (await searchParams) || {};
  const page = Math.max(Number(params.page || 1), 1);
  const q = params.q || "";
  const status = params.status || "";
  const assignedStaffId = params.assignedStaffId || "";

  const baseWhere = {
    ...(q
      ? {
          OR: [
            { phoneLast9: { contains: q } },
            { phoneRaw: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { statusText: status } : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
  };

  const where = user
    ? {
        AND: [baseWhere, buildPhoneRecordScope(user)],
      }
    : { id: "__never__" };

  const [total, recordsRaw, staffOptions] = await Promise.all([
    db.phoneRecord.count({ where }),
    db.phoneRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        assignedStaff: { select: { id: true, username: true, role: true, teamLeaderId: true } },
        leader: { select: { id: true, username: true, role: true } },
      },
    }),
    db.user.findMany({
      where: user ? { AND: [buildStaffScope(user), { isActive: true }] } : { id: "__never__" },
      select: { id: true, username: true, role: true },
    }),
  ]);

  const records = recordsRaw.map((item) => ({
    ...item,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Số điện thoại" description="Quản lý record, cập nhật status, ghi chú và phân công nhân viên." />
      <PhoneRecordsClient
        initialRecords={records}
        staffOptions={staffOptions}
        canAssign={user?.role === "admin" || user?.role === "leader"}
        initialFilters={{ q, status, assignedStaffId }}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
        }}
      />
    </div>
  );
}
