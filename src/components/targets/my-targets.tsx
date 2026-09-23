import { Target } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { getDictionary } from "@/i18n/dictionaries";
import { targetTypeLabel } from "@/i18n/enum-labels";
import type { TargetRow } from "@/components/targets/targets-table";

export function MyTargets({ rows, dict }: { rows: TargetRow[]; dict: ReturnType<typeof getDictionary> }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState icon={Target} message={dict.targets.noTargetsMine} />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const isRevenue = row.targetType === "REVENUE";
        const achieved = isRevenue ? formatCurrency(row.actual, row.currency) : String(row.actual);
        const target = isRevenue ? formatCurrency(row.targetValue, row.currency) : String(row.targetValue);
        const remaining = Math.max(0, row.targetValue - row.actual);
        const remainingLabel = isRevenue ? formatCurrency(remaining, row.currency) : String(remaining);
        const pct = Math.round(row.achievementPct);

        return (
          <Card key={row.id}>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">{row.periodLabel}</div>
                  <div className="text-base font-semibold text-foreground">{targetTypeLabel(dict, row.targetType)}</div>
                </div>
                {row.achievementPct >= 100 ? <Badge tone="success">{dict.targets.targetAchieved}</Badge> : null}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-foreground">{achieved}</span>
                <span className="text-sm text-muted">/ {target}</span>
              </div>

              <ProgressBar pct={pct} />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {dict.targets.remaining}: <span className="font-medium text-foreground">{remainingLabel}</span>
                </span>
                <span className="font-semibold text-primary">{pct}%</span>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
