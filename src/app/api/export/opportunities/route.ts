import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { opportunityScope } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";
import { getPipelineStagesForOpportunities } from "@/lib/pipeline-stages";
import { formatDate } from "@/lib/utils";
import { getServerDict } from "@/i18n/server-dict";
import { resolveStageLabel } from "@/i18n/enum-labels";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const dict = await getServerDict();

  const opportunities = await prisma.opportunity.findMany({
    where: await opportunityScope(user),
    include: { owner: true, contact: true, company: true },
    orderBy: { createdAt: "desc" },
  });
  const stages = await getPipelineStagesForOpportunities(opportunities.map((o) => o.id));

  const csv = toCsv(
    opportunities.map((o) => ({
      title: o.title,
      account: o.company?.name ?? "",
      contact: o.contact.name,
      value: o.value,
      currency: o.currency,
      stage: resolveStageLabel(dict, o.stage, stages),
      probability: o.probability,
      owner: o.owner.name,
      expectedCloseDate: formatDate(o.expectedCloseDate),
      createdAt: formatDate(o.createdAt),
    })),
    [
      { key: "title", label: dict.fields.title },
      { key: "account", label: dict.fields.account },
      { key: "contact", label: dict.fields.contact },
      { key: "value", label: dict.fields.value },
      { key: "currency", label: dict.fields.currency },
      { key: "stage", label: dict.fields.stage },
      { key: "probability", label: `${dict.fields.probability} %` },
      { key: "owner", label: dict.fields.owner },
      { key: "expectedCloseDate", label: dict.fields.expectedCloseDate },
      { key: "createdAt", label: dict.fields.created },
    ]
  );

  return csvResponse(csv, "opportunities.csv");
}
