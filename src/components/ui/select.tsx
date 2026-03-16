import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const selectBaseClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectBaseClass, className)} {...props} />;
}
