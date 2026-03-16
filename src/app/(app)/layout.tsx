import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { getSessionUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar role={user.role} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppTopbar name={user.name} role={user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
