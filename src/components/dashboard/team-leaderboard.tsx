import { Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@/lib/validations";
import type { Dictionary } from "@/i18n/dictionaries";
import { ProgressBar } from "@/components/ui/progress-bar";

const RANK_TONE = [
  "bg-[var(--rank-gold-bg)] text-[var(--rank-gold)]",
  "bg-[var(--rank-silver-bg)] text-[var(--rank-silver)]",
  "bg-[var(--rank-bronze-bg)] text-[var(--rank-bronze)]",
];

export function TeamLeaderboard({ entries, dict }: { entries: { name: string; won: number }[]; dict: Dictionary }) {
  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">{dict.dashboard.no_won_this_month}</p>;
  }

  const max = Math.max(...entries.map((e) => e.won), 1);

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-3">
          <div
            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              RANK_TONE[i] ?? "bg-background text-muted"
            }`}
          >
            {i === 0 ? <Trophy className="size-3.5" /> : i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium text-foreground">{entry.name}</span>
              <span className="shrink-0 text-muted">{formatCurrency(entry.won, DEFAULT_CURRENCY)}</span>
            </div>
            <ProgressBar
              pct={Math.max(4, Math.round((entry.won / max) * 100))}
              tone="primary"
              trackClassName="mt-1 h-1.5"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
