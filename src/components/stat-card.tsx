import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  featured = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger";
  /** Gives this card more visual weight (bigger value, bigger icon chip) — use for the one headline metric
   * in a row of stat cards, so the row reads as prioritized instead of everything looking equally important. */
  featured?: boolean;
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
  }[tone];

  const barClasses = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[var(--shadow-card-hover)]",
        featured ? "bg-gradient-to-br from-surface to-primary/8 p-5" : "p-4"
      )}
    >
      <span className={cn("absolute inset-y-3 start-0 w-0.5 rounded-full", barClasses)} />
      <div className="flex items-center justify-between gap-3 ps-2">
        <span className={cn("text-sm text-muted", featured && "font-medium")}>{label}</span>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl",
            featured ? "size-10" : "size-9",
            toneClasses
          )}
        >
          <Icon className={featured ? "size-5" : "size-4.5"} />
        </div>
      </div>
      <div className={cn("mt-2 ps-2 font-semibold tracking-tight text-foreground", featured ? "text-3xl" : "text-2xl")}>
        {value}
      </div>
      {hint ? <div className="mt-1 ps-2 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
