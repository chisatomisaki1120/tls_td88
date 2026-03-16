import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, username: true, role: true, isActive: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Người dùng" description="Admin quản lý leader và staff tại đây." />
      <UsersClient initialUsers={users} />
    </div>
  );
}
