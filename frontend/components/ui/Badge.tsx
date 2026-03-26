import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "genre" | "premium" | "status" | "new-episode" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-anime-bg-surface text-muted",
    genre: "bg-anime-cyan/15 text-anime-cyan",
    premium: "bg-anime-gold/20 text-anime-gold",
    status: "bg-anime-success/15 text-anime-success",
    "new-episode": "bg-anime-accent/20 text-anime-accent",
    success: "bg-anime-success/15 text-anime-success",
    warning: "bg-anime-warning/20 text-anime-warning",
    danger: "bg-anime-error/15 text-anime-error",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-semibold uppercase",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
