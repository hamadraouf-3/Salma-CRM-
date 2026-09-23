import { prisma } from "@/lib/prisma";

const SYSTEM_STAGES = [
  { id: "NEW", label: "New", order: 0, isSystem: true, defaultProbability: 10 },
  { id: "WON", label: "Won", order: 900, isSystem: true, defaultProbability: 100 },
  { id: "LOST", label: "Lost", order: 901, isSystem: true, defaultProbability: 0 },
] as const;

/** db push creates the table without the migration seed, so New Opportunity's stage list is empty until these exist. */
export async function ensureSystemStages() {
  const existing = await prisma.pipelineStage.findMany({
    where: { id: { in: SYSTEM_STAGES.map((stage) => stage.id) } },
    select: { id: true },
  });
  const have = new Set(existing.map((stage) => stage.id));
  const missing = SYSTEM_STAGES.filter((stage) => !have.has(stage.id));
  if (missing.length === 0) return;
  await prisma.pipelineStage.createMany({
    data: missing.map((stage) => ({
      id: stage.id,
      label: stage.label,
      order: stage.order,
      isSystem: stage.isSystem,
      defaultProbability: stage.defaultProbability,
    })),
  });
}

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
  await ensureSystemStages();
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
  await ensureSystemStages();
  return prisma.pipelineStage.findMany({
    where: { OR: [{ opportunityId: null }, { opportunityId: { in: opportunityIds } }] },
    orderBy: { order: "asc" },
  });
}
