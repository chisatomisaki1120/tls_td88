"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/phone-records", label: "Số điện thoại" },
  { href: "/imports", label: "Import" },
  { href: "/users", label: "Người dùng", adminOnly: true },
];

export function AppSidebar({ role }: { role: "admin" | "leader" | "staff" }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block">
      <div className="mb-8 px-3">
        <div className="text-lg font-semibold text-slate-900">TLS TD88</div>
        <div className="text-sm text-slate-500">Dashboard nội bộ</div>
      </div>
      <nav className="space-y-1">
        {items
          .filter((item) => !item.adminOnly || role === "admin")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm font-medium transition",
                pathname === item.href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}
