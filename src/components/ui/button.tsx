import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const buttonBaseClass = "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariantClass = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
} as const;

export function Button({ className, variant = "primary", ...props }: Props) {
  return <button className={cn(buttonBaseClass, buttonVariantClass[variant], className)} {...props} />;
}
