import { Download, List } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { opportunityScope } from "@/lib/scope";
import { LinkButton } from "@/components/ui/button";
import { OpportunityBoard } from "@/components/opportunities/opportunity-board";
import { getPipelineStagesForOpportunities } from "@/lib/pipeline-stages";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";

export default async function OpportunitiesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const opportunities = await prisma.opportunity.findMany({
    where: await opportunityScope(user),
    include: { contact: true, owner: true, convertedFromLead: { include: { owner: true } } },
    orderBy: { createdAt: "desc" },
  });
  // Bulk-fetched: the 3 system stages plus every visible Opportunity's own custom workflow steps, so the
  // per-card "manage workflow" modal has what it needs without a fetch per card.
  const stages = await getPipelineStagesForOpportunities(opportunities.map((o) => o.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{dict.opportunities.boardTitle}</h1>
        <div className="flex gap-2">
          <LinkButton href="/opportunities/list" variant="secondary">
            <List className="size-4" />
            {dict.opportunities.listView}
          </LinkButton>
          <LinkButton href="/api/export/opportunities" variant="secondary">
            <Download className="size-4" />
            {dict.opportunities.exportCsv}
          </LinkButton>
        </div>
      </div>

      <OpportunityBoard
        initialOpportunities={opportunities}
        stages={stages}
        isAdmin={user.role === "ADMIN"}
        currentUserId={user.id}
      />
    </div>
  );
}
