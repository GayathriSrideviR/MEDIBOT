import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-200",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-200",
    destructive: "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30",
    outline: "border-border text-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
