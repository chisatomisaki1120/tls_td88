import { LogoutButton } from "@/components/layout/logout-button";

type AppRole = "admin" | "staff";

function getRoleLabel(role: AppRole) {
  return role === "admin" ? "Admin" : "Nhân viên";
}

function UserIdentity({ username, role }: { username: string; role: AppRole }) {
  return (
    <>
      <div>
        <div className="text-sm text-slate-500">Xin chào</div>
        <div className="font-medium text-slate-900">{username}</div>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
        {getRoleLabel(role)}
      </span>
    </>
  );
}

export function AppTopbar({ username, role }: { username: string; role: AppRole }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <UserIdentity username={username} role={role} />
      <div className="flex items-center gap-3">
        <LogoutButton />
      </div>
    </header>
  );
}
