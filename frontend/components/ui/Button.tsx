import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "premium";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-anime-accent/50";

    const variants = {
      primary: "bg-anime-accent hover:bg-anime-accent-hover text-white hover:shadow-glow",
      secondary: "bg-transparent border border-anime-accent text-anime-accent hover:bg-anime-accent/10",
      ghost: "bg-transparent text-anime-text-secondary hover:text-anime-text hover:bg-anime-bg-tertiary",
      danger: "bg-anime-error hover:brightness-110 text-white",
      premium: "bg-gradient-to-r from-anime-accent to-anime-cyan text-white hover:brightness-110",
    };

    const sizes = {
      sm: "h-8 px-3 text-[13px]",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
