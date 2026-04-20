import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-dim",
        "focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-fg-muted",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[11px] uppercase tracking-[0.18em] text-fg-muted", className)}
      {...props}
    />
  );
}

export function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

export function HelperText({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={cn("text-[11px]", error ? "text-recovery-low" : "text-fg-dim")}>
      {children}
    </p>
  );
}
