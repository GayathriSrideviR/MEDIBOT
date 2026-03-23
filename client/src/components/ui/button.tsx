import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "glass" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const variantClasses = {
  default:
    "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
  outline: "border-2 border-primary/20 text-primary hover:bg-primary/5",
  ghost: "hover:bg-primary/10 text-foreground",
  glass:
    "bg-white/50 backdrop-blur-md border border-white/50 text-primary hover:bg-white/80 shadow-sm",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
} as const;

const sizeClasses = {
  default: "h-12 px-6 py-3",
  sm: "h-9 px-4 text-sm",
  lg: "h-14 px-8 text-lg",
  icon: "h-12 w-12",
} as const;

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
