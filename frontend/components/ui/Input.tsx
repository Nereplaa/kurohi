import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[13px] font-semibold text-muted">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "w-full h-10 bg-anime-bg-surface border border-anime-border rounded-md px-3 text-sm text-fg placeholder-dim",
          "focus:outline-none focus:border-anime-border-focus focus:ring-2 focus:ring-anime-accent/20 transition-all duration-200",
          error && "border-anime-error",
          props.disabled && "opacity-50 bg-anime-bg-tertiary",
          className
        )}
        {...props}
      />
      {error && <p className="text-anime-error text-xs">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
