import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { buildPhoneRecordScope, buildStaffScope, canManageUsers } from "@/lib/permissions";
import { db } from "@/lib/db";
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

  const staffScope = user ? await buildStaffScope(user) : { id: "__never__" };
  const canAssign = user ? await canManageUsers(user.role, user.id) : false;
  const staffOptions = await db.user.findMany({
    where: { AND: [staffScope, { isActive: true }] },
    select: { id: true, username: true, role: true },
  });

  let records: Record<string, unknown>[] = [];
  let total = 0;

  if (user) {
    const scope = await buildPhoneRecordScope(user);
    const baseWhere = {
      ...(q ? { OR: [{ phoneLast9: { startsWith: q } }, { phoneRaw: { startsWith: q } }] } : {}),
      ...(assignedStaffId ? { assignedStaffId } : {}),
      ...(status ? { statusText: status } : {}),
    };
    const where = { AND: [baseWhere, scope] };

    [total, records] = await Promise.all([
      db.phoneRecord.count({ where }),
      db.phoneRecord.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          assignedStaff: { select: { id: true, username: true, role: true } },
          leader: { select: { id: true, username: true, role: true } },
        },
      }),
    ]);
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Số điện thoại"
      />
      <PhoneRecordsClient
        initialRecords={JSON.parse(JSON.stringify(records))}
        staffOptions={staffOptions}
        canAssign={canAssign}
        initialFilters={{ q, status, assignedStaffId }}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages }}
      />
    </div>
  );
}
