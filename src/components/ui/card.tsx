import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const cardBaseClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardBaseClass, className)} {...props} />;
}
