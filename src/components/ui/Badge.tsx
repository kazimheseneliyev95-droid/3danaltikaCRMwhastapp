import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        {
          "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80": variant === "default",
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80": variant === "secondary",
          "border-transparent bg-red-900/50 text-red-200 hover:bg-red-900/60": variant === "destructive",
          "border-transparent bg-yellow-900/50 text-yellow-200 hover:bg-yellow-900/60": variant === "warning",
          "border-transparent bg-green-900/50 text-green-200 hover:bg-green-900/60": variant === "success",
          "text-slate-50": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
