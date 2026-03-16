import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStaffScope } from "@/lib/permissions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "leader") redirect("/dashboard");

  const [users, leaders] = await Promise.all([
    db.user.findMany({
      where: user.role === "admin" ? undefined : buildStaffScope(user),
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        teamLeaderId: true,
        teamLeader: { select: { id: true, username: true } },
      },
    }),
    db.user.findMany({ where: { role: "leader", isActive: true }, select: { id: true, username: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Người dùng"
        description={user.role === "admin" ? "Admin quản lý leader, staff và team mapping tại đây." : "Leader quản lý staff thuộc team mình tại đây."}
      />
      <UsersClient initialUsers={users} leaders={leaders} currentRole={user.role} currentUserId={user.id} />
    </div>
  );
}
