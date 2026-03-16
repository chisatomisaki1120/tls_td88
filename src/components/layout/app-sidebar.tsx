"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "staff";

type SidebarItem = {
  href: string;
  label: string;
  roles?: AppRole[];
};

const sidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/phone-records", label: "Số điện thoại" },
  { href: "/imports", label: "Import", roles: ["admin", "staff"] },
  { href: "/users", label: "Người dùng", roles: ["admin", "staff"] },
];

function SidebarLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {label}
    </Link>
  );
}

export function AppSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const visibleItems = sidebarItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block">
      <div className="mb-8 px-3">
        <div className="text-lg font-semibold text-slate-900">TLS TD88</div>
        <div className="text-sm text-slate-500">Dashboard nội bộ</div>
      </div>
      <nav className="space-y-1">
        {visibleItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
        ))}
      </nav>
    </aside>
  );
}
