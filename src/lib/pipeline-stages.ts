import { prisma } from "@/lib/prisma";

export type PipelineStageRow = {
  id: string;
  label: string;
  order: number;
  isSystem: boolean;
  defaultProbability: number;
  opportunityId: string | null;
};

/**
 * The system stages (NEW/WON/LOST, shared by every Opportunity) plus, when `opportunityId` is given,
 * that one Opportunity's own custom workflow steps — never another Opportunity's. Pass no
 * `opportunityId` for contexts where the Opportunity doesn't exist yet (creating one), since a custom
 * step can only be added from an Opportunity's own detail page once it exists.
 */
export async function getPipelineStages(opportunityId?: string): Promise<PipelineStageRow[]> {
  return prisma.pipelineStage.findMany({
    where: opportunityId ? { OR: [{ opportunityId: null }, { opportunityId }] } : { opportunityId: null },
    orderBy: { order: "asc" },
  });
}

/**
 * The system stages plus every custom workflow step belonging to any of the given Opportunities — for
 * views that list many Opportunities at once (the list view, CSV export) and need to resolve each row's
 * own stage label/tone, since two different Opportunities can be sitting in two different custom steps
 * at the same time.
 */
export async function getPipelineStagesForOpportunities(opportunityIds: string[]): Promise<PipelineStageRow[]> {
  return prisma.pipelineStage.findMany({
    where: { OR: [{ opportunityId: null }, { opportunityId: { in: opportunityIds } }] },
    orderBy: { order: "asc" },
  });
}
