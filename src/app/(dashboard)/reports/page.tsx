import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { opportunityScope } from "@/lib/scope";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { WinLossPie } from "@/components/dashboard/win-loss-pie";
import { RepBarChart } from "@/components/dashboard/rep-bar-chart";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { DEFAULT_CURRENCY } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ReportsPage() {
  const user = await requireUser();
  const scope = await opportunityScope(user);
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [wonCount, lostCount, wonOpportunities, closedInRange] = await Promise.all([
    prisma.opportunity.count({ where: { ...scope, stage: "WON" } }),
    prisma.opportunity.count({ where: { ...scope, stage: "LOST" } }),
    prisma.opportunity.findMany({ where: { ...scope, stage: "WON" }, include: { owner: true } }),
    prisma.opportunity.findMany({
      where: { ...scope, stage: "WON", closedAt: { gte: sixMonthsAgo }, currency: DEFAULT_CURRENCY },
      select: { value: true, closedAt: true },
    }),
  ]);

  // Charts sum raw amounts, so they only make sense for opportunities sharing one currency.
  // We chart the default currency and roll everything else into the "total" line below.
  const repTotals = new Map<string, number>();
  for (const opportunity of wonOpportunities) {
    if (opportunity.currency !== DEFAULT_CURRENCY) continue;
    repTotals.set(opportunity.owner.name, (repTotals.get(opportunity.owner.name) ?? 0) + opportunity.value);
  }
  const repData = Array.from(repTotals.entries())
    .map(([rep, won]) => ({ rep, won }))
    .sort((a, b) => b.won - a.won)
    .slice(0, 8);

  const monthFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", { month: "short", year: "2-digit" });
  const monthBuckets: { key: string; month: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: monthFormatter.format(d), value: 0 });
  }
  for (const opportunity of closedInRange) {
    if (!opportunity.closedAt) continue;
    const key = `${opportunity.closedAt.getFullYear()}-${opportunity.closedAt.getMonth()}`;
    const bucket = monthBuckets.find((b) => b.key === key);
    if (bucket) bucket.value += opportunity.value;
  }

  const wonByCurrency = new Map<string, number>();
  for (const opportunity of wonOpportunities) {
    wonByCurrency.set(opportunity.currency, (wonByCurrency.get(opportunity.currency) ?? 0) + opportunity.value);
  }
  const totalWonLabel = Array.from(wonByCurrency.entries())
    .map(([currency, value]) => formatCurrency(value, currency))
    .join(" + ") || formatCurrency(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{dict.reports.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={dict.reports.winVsLoss} />
          <CardBody>
            <WinLossPie won={wonCount} lost={lostCount} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={dict.reports.topReps}
            description={dict.reports.totalWon.replace("{value}", totalWonLabel)}
          />
          <CardBody>
            {repData.length > 0 ? (
              <RepBarChart data={repData} />
            ) : (
              <p className="flex h-56 items-center justify-center text-sm text-muted">{dict.reports.noWonOpportunities}</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={dict.reports.trendTitle.replace("{currency}", DEFAULT_CURRENCY)} />
        <CardBody>
          <TrendLineChart data={monthBuckets} />
        </CardBody>
      </Card>
    </div>
  );
}
