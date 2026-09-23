"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { canAccessOwner } from "@/lib/scope";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function clampProbability(raw: FormDataEntryValue | null): number {
  const n = Number(raw ?? 50);
  if (Number.isNaN(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Adds a custom workflow step to one Opportunity — never shared with or copied to any other Opportunity.
 * Managed by the System Admin (any Opportunity) or that Opportunity's own owner — the same ownership rule
 * already used to edit the Opportunity itself. */
export async function createPipelineStage(
  opportunityId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) return { error: translateMessage(dict, "Opportunity not found") };
  if (!(await canAccessOwner(user, opportunity.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this opportunity") };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: translateMessage(dict, "Stage name is required") };
  const defaultProbability = clampProbability(formData.get("defaultProbability"));

  const [maxOrderResult, wonStage] = await Promise.all([
    prisma.pipelineStage.aggregate({ where: { opportunityId }, _max: { order: true } }),
    prisma.pipelineStage.findUnique({ where: { id: "WON" } }),
  ]);
  const nextOrder = (maxOrderResult._max.order ?? 0) + 10;
  const order = wonStage && nextOrder >= wonStage.order ? wonStage.order - 1 : nextOrder;

  await prisma.pipelineStage.create({ data: { label, order, defaultProbability, isSystem: false, opportunityId } });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  return null;
}

export async function updatePipelineStage(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  const existing = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Stage not found") };
  if (existing.isSystem) return { error: translateMessage(dict, "System stages can't be renamed") };

  const opportunity = existing.opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: existing.opportunityId } })
    : null;
  if (!opportunity || !(await canAccessOwner(user, opportunity.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this opportunity") };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: translateMessage(dict, "Stage name is required") };
  const defaultProbability = clampProbability(formData.get("defaultProbability"));

  await prisma.pipelineStage.update({ where: { id }, data: { label, defaultProbability } });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${existing.opportunityId}`);
  return null;
}

export async function deletePipelineStage(id: string): Promise<void> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  const existing = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!existing) return;
  if (existing.isSystem) throw new Error(translateMessage(dict, "System stages can't be deleted"));

  const opportunity = existing.opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: existing.opportunityId } })
    : null;
  if (!opportunity || !(await canAccessOwner(user, opportunity.ownerId))) {
    throw new Error(translateMessage(dict, "You do not have permission to edit this opportunity"));
  }

  const inUse = await prisma.opportunity.count({ where: { stage: id } });
  if (inUse > 0) {
    throw new Error(translateMessage(dict, "This stage is used by existing opportunities and can't be deleted"));
  }

  await prisma.pipelineStage.delete({ where: { id } });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${existing.opportunityId}`);
}

export async function movePipelineStage(id: string, direction: "up" | "down"): Promise<void> {
  const user = await requireActionUser();

  const stage = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!stage || stage.isSystem) return;

  const opportunity = stage.opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: stage.opportunityId } })
    : null;
  if (!opportunity || !(await canAccessOwner(user, opportunity.ownerId))) return;

  const neighbor = await prisma.pipelineStage.findFirst({
    where: {
      opportunityId: stage.opportunityId,
      isSystem: false,
      order: direction === "up" ? { lt: stage.order } : { gt: stage.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: stage.id }, data: { order: neighbor.order } }),
    prisma.pipelineStage.update({ where: { id: neighbor.id }, data: { order: stage.order } }),
  ]);

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${stage.opportunityId}`);
}
