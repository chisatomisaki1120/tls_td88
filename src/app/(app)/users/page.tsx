import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStaffScope, canManageUsers } from "@/lib/permissions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await canManageUsers(user.role, user.id))) redirect("/dashboard");

  const userWhere = user.role === "admin" ? undefined : await buildStaffScope(user);
  const teamWhere = user.role === "admin" ? undefined : { leaderId: user.id };
  const leaderWhere = user.role === "admin" ? { isActive: true, role: "staff" as const } : { id: user.id, isActive: true, role: "staff" as const };

  const [users, teams, leaders] = await Promise.all([
    db.user.findMany({ where: userWhere, orderBy: [{ role: "asc" }, { createdAt: "desc" }], select: { id: true, username: true, role: true, isActive: true, teamId: true, team: { select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } } } }, _count: { select: { assignedRecords: true } } } }),
    db.team.findMany({ where: teamWhere, orderBy: { createdAt: "desc" }, select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } }, members: { where: { role: "staff" }, select: { id: true, username: true } } } }),
    db.user.findMany({ where: leaderWhere, orderBy: { username: "asc" }, select: { id: true, username: true } }),
  ]);

  const mappedUsers = users.map((item) => ({ ...item, recordCount: item._count.assignedRecords }));
  return <div className="space-y-6"><PageHeader title="Người dùng & tổ" description={user.role === "admin" ? "Tạo tổ, đặt tên tổ, chọn tổ trưởng và chuyển nhân viên giữa các tổ linh hoạt." : "Bạn đang là tổ trưởng của tổ mình và có thể quản lý nhân viên trong tổ."} /><UsersClient initialUsers={mappedUsers} initialTeams={teams} leaders={leaders} currentRole={user.role} currentUserId={user.id} /></div>;
}
