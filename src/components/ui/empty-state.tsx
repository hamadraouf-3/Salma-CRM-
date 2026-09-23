import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-background text-muted">
        <Icon className="size-5" />
      </span>
      <p className="max-w-xs text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}
