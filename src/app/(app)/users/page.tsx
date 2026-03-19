import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { buildStaffScope, canManageUsers } from "@/lib/permissions";
import { db } from "@/lib/db";
import { teamSummarySelect, userSummarySelect, withRecordCount } from "@/lib/team";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hasAccess = await canManageUsers(user.role, user.id);
  if (!hasAccess) redirect("/dashboard");

  const staffWhere = user.role === "admin" ? undefined : await buildStaffScope(user);
  const [users, teams, leaders] = await Promise.all([
    db.user.findMany({ where: staffWhere, orderBy: [{ role: "asc" }, { createdAt: "desc" }], select: userSummarySelect }),
    db.team.findMany({ where: user.role === "admin" ? undefined : { leaderId: user.id }, orderBy: { createdAt: "desc" }, select: teamSummarySelect }),
    db.user.findMany({ where: user.role === "admin" ? { isActive: true, role: "staff" as const } : { id: user.id, isActive: true, role: "staff" as const }, select: { id: true, username: true }, orderBy: { username: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Người dùng & tổ"
      />
      <UsersClient
        initialUsers={JSON.parse(JSON.stringify(users.map(withRecordCount)))}
        initialTeams={JSON.parse(JSON.stringify(teams))}
        leaders={JSON.parse(JSON.stringify(leaders))}
        currentRole={user.role}
        currentUserId={user.id}
      />
    </div>
  );
}
