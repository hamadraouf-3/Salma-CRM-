import { cn } from "@/lib/utils";

function toneForPct(pct: number) {
  if (pct >= 100) return "bg-success";
  if (pct >= 70) return "bg-gradient-to-r from-info to-success";
  if (pct >= 40) return "bg-gradient-to-r from-warning to-info";
  return "bg-gradient-to-r from-danger to-warning";
}

export function ProgressBar({
  pct,
  tone = "auto",
  className,
  trackClassName,
}: {
  pct: number;
  /** "auto" colors green/amber/red by how close `pct` is to a 100% goal. Use "primary" for
   * bars that show a plain relative share (e.g. "this rep vs. the top rep"), not goal achievement. */
  tone?: "auto" | "primary";
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-background", trackClassName)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "auto" ? toneForPct(pct) : "bg-primary",
          className
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
