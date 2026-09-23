import Link from "next/link";
import { Download, LayoutGrid, Flame } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { opportunityScope } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PrintButton } from "@/components/opportunities/print-button";
import { type OpportunityStage } from "@/lib/validations";
import { opportunityStageTone } from "@/lib/badge-tones";
import { getPipelineStagesForOpportunities } from "@/lib/pipeline-stages";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { resolveStageLabel } from "@/i18n/enum-labels";
import type { Dictionary } from "@/i18n/dictionaries";

type ViewId = "all" | "mine" | "closing-month";

const VIEW_IDS: ViewId[] = ["all", "mine", "closing-month"];
const VIEW_LABEL_KEYS: Record<ViewId, keyof Dictionary["opportunities"]> = {
  all: "viewAll",
  mine: "viewMine",
  "closing-month": "viewClosingMonth",
};

export default async function OpportunitiesListPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { view } = await searchParams;
  const activeView: ViewId = VIEW_IDS.includes(view as ViewId) ? (view as ViewId) : "all";
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const viewFilter =
    activeView === "mine"
      ? { ownerId: user.id, stage: { notIn: ["WON", "LOST"] } }
      : activeView === "closing-month"
        ? { expectedCloseDate: { gte: startOfMonth, lte: endOfMonth }, stage: { notIn: ["WON", "LOST"] } }
        : {};

  const opportunities = await prisma.opportunity.findMany({
    where: { ...(await opportunityScope(user)), ...viewFilter },
    include: { contact: true, company: true, owner: true, convertedFromLead: { include: { owner: true } } },
    orderBy: { createdAt: "desc" },
  });
  const stages = await getPipelineStagesForOpportunities(opportunities.map((o) => o.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{dict.opportunities.listTitle}</h1>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/opportunities" variant="secondary">
            <LayoutGrid className="size-4" />
            {dict.opportunities.boardView}
          </LinkButton>
          <LinkButton href="/api/export/opportunities" variant="secondary">
            <Download className="size-4" />
            {dict.opportunities.exportCsv}
          </LinkButton>
          <PrintButton />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {VIEW_IDS.map((id) => (
          <Link
            key={id}
            href={id === "all" ? "/opportunities/list" : `/opportunities/list?view=${id}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeView === id
                ? "bg-primary/10 text-primary"
                : "bg-surface text-muted ring-1 ring-inset ring-border hover:text-foreground"
            )}
          >
            {dict.opportunities[VIEW_LABEL_KEYS[id]]}
          </Link>
        ))}
      </div>

      <h1 className="hidden text-xl font-semibold text-foreground print:block">{dict.opportunities.printTitle}</h1>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colTitle}</th>
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colAccount}</th>
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colContact}</th>
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colStage}</th>
              <th className="px-4 py-3 text-end font-medium">{dict.opportunities.colValue}</th>
              <th className="px-4 py-3 text-end font-medium">{dict.opportunities.colProbability}</th>
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colOwner}</th>
              <th className="px-4 py-3 text-start font-medium">{dict.opportunities.colExpectedClose}</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-background">
                <td className="px-4 py-3 font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Link href={`/opportunities/${o.id}`} className="text-primary hover:underline print:text-foreground print:no-underline">
                      {o.title}
                    </Link>
                    {o.convertedFromLead ? (
                      <span
                        className="shrink-0 text-warning print:hidden"
                        title={dict.opportunities.fromLeadTooltip.replace("{name}", o.convertedFromLead.owner.name)}
                      >
                        <Flame className="size-3.5" />
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{o.company?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{o.contact.name}</td>
                <td className="px-4 py-3">
                  <Badge tone={opportunityStageTone[o.stage as OpportunityStage] ?? "primary"}>
                    {resolveStageLabel(dict, o.stage, stages)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-end text-foreground">{formatCurrency(o.value, o.currency)}</td>
                <td className="px-4 py-3 text-end text-muted">{o.probability}%</td>
                <td className="px-4 py-3 text-muted">{o.owner.name}</td>
                <td className="px-4 py-3 text-muted">{formatDate(o.expectedCloseDate)}</td>
              </tr>
            ))}
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                  {activeView === "all" ? dict.opportunities.emptyAll : dict.opportunities.emptyFiltered}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
