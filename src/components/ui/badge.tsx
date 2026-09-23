import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "danger" | "warning" | "info" | "primary";

const toneClasses: Record<Tone, string> = {
  default: "bg-muted/12 text-foreground ring-1 ring-inset ring-border",
  success: "bg-success-bg text-success ring-1 ring-inset ring-success/15",
  danger: "bg-danger-bg text-danger ring-1 ring-inset ring-danger/15",
  warning: "bg-warning-bg text-warning ring-1 ring-inset ring-warning/15",
  info: "bg-info-bg text-info ring-1 ring-inset ring-info/15",
  primary: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
