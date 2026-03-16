import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildPhoneRecordScope, buildStaffScope, canManageUsers } from "@/lib/permissions";
import { PhoneRecordsClient } from "./phone-records-client";

const PAGE_SIZE = 50;

type SearchParams = {
  page?: string;
  q?: string;
  status?: string;
  assignedStaffId?: string;
};

export default async function PhoneRecordsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const user = await getSessionUser();
  const params = (await searchParams) || {};

  const page = Math.max(Number(params.page || 1), 1);
  const q = params.q || "";
  const status = params.status || "";
  const assignedStaffId = params.assignedStaffId || "";

  const baseWhere = {
    ...(q ? { OR: [{ phoneLast9: { contains: q } }, { phoneRaw: { contains: q } }] } : {}),
    ...(status ? { statusText: status } : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
  };

  const scope = user ? await buildPhoneRecordScope(user) : { id: "__never__" };
  const staffScope = user ? await buildStaffScope(user) : { id: "__never__" };
  const where = { AND: [baseWhere, scope] };
  const canAssign = user ? await canManageUsers(user.role, user.id) : false;

  const [total, recordsRaw, staffOptions] = await Promise.all([
    db.phoneRecord.count({ where }),
    db.phoneRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        assignedStaff: { select: { id: true, username: true, role: true, teamId: true, team: { select: { leaderId: true } } } },
        leader: { select: { id: true, username: true, role: true } },
      },
    }),
    db.user.findMany({ where: { AND: [staffScope, { isActive: true }] }, select: { id: true, username: true, role: true } }),
  ]);

  const records = recordsRaw.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }));
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Số điện thoại"
        description="Quản lý record, cập nhật status, ghi chú và phân công nhân viên."
      />
      <PhoneRecordsClient
        initialRecords={records}
        staffOptions={staffOptions}
        canAssign={canAssign}
        initialFilters={{ q, status, assignedStaffId }}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages }}
      />
    </div>
  );
}
