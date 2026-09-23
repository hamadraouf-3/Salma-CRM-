import { cn } from "@/lib/utils";

export function StatGrid({ stats }: { stats: { label: string; value: string; tone?: "default" | "success" | "danger" }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-surface px-3 py-2.5">
          <div className="text-xs text-muted">{s.label}</div>
          <div
            className={cn(
              "mt-0.5 text-lg font-semibold",
              s.tone === "success" ? "text-success" : s.tone === "danger" ? "text-danger" : "text-foreground"
            )}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
