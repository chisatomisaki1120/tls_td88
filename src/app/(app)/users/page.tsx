import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStaffScope, canManageUsers } from "@/lib/permissions";
import { teamSummarySelect, userSummarySelect, withRecordCount } from "@/lib/team";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await canManageUsers(user.role, user.id))) redirect("/dashboard");

  const userWhere = user.role === "admin" ? undefined : await buildStaffScope(user);
  const teamWhere = user.role === "admin" ? undefined : { leaderId: user.id };
  const leaderWhere = user.role === "admin" ? { isActive: true, role: "staff" as const } : { id: user.id, isActive: true, role: "staff" as const };

  const [users, teams, leaders] = await Promise.all([
    db.user.findMany({ where: userWhere, orderBy: [{ role: "asc" }, { createdAt: "desc" }], select: userSummarySelect }),
    db.team.findMany({ where: teamWhere, orderBy: { createdAt: "desc" }, select: teamSummarySelect }),
    db.user.findMany({ where: leaderWhere, orderBy: { username: "asc" }, select: { id: true, username: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Người dùng & tổ"
        description={user.role === "admin" ? "Tạo tổ, đặt tên tổ, chọn tổ trưởng và chuyển nhân viên giữa các tổ linh hoạt." : "Bạn đang là tổ trưởng của tổ mình và có thể quản lý nhân viên trong tổ."}
      />
      <UsersClient initialUsers={users.map(withRecordCount)} initialTeams={teams} leaders={leaders} currentRole={user.role} currentUserId={user.id} />
    </div>
  );
}
