import { LogoutButton } from "@/components/layout/logout-button";

function getRoleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Nhân viên";
  if (role === "staff") return "Nhân viên";
  return role;
}

export function AppTopbar({ username, role }: { username: string; role: string }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <div className="text-sm text-slate-500">Xin chào</div>
        <div className="font-medium text-slate-900">{username}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          {getRoleLabel(role)}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
