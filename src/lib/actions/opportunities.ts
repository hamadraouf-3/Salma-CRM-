"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, resolveVisibility, canAccessOwner } from "@/lib/scope";
import {
  opportunitySchema,
  DEFAULT_CURRENCY,
  stageGateCheck,
  type OpportunityStage,
} from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage, stageGateMessage } from "@/i18n/messages";
import { ensureSystemStages } from "@/lib/pipeline-stages";

export type ActionState = { error?: string } | null;

function readOpportunityInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    value: String(formData.get("value") ?? "0"),
    currency: String(formData.get("currency") ?? DEFAULT_CURRENCY),
    stage: String(formData.get("stage") ?? "NEW"),
    probability: String(formData.get("probability") ?? "10"),
    lostReason: String(formData.get("lostReason") ?? ""),
    source: String(formData.get("source") ?? ""),
    competitor: String(formData.get("competitor") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
    companyId: String(formData.get("companyId") ?? ""),
    contactId: String(formData.get("contactId") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
    visibility: String(formData.get("visibility") ?? ""),
    expectedCloseDate: String(formData.get("expectedCloseDate") ?? ""),
  };
}

export async function createOpportunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const parsed = opportunitySchema.safeParse(readOpportunityInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  // Only the shared system stages (NEW/WON/LOST) exist before the Opportunity does — a custom workflow
  // step can only be added afterward, from the Opportunity's own detail page.
  await ensureSystemStages();
  const stageRow = await prisma.pipelineStage.findUnique({ where: { id: data.stage } });
  if (!stageRow || stageRow.opportunityId !== null) {
    return { error: translateMessage(dict, "Invalid stage") };
  }

  const gateFailure = stageGateCheck(data.stage, data.value, data.nextAction);
  if (gateFailure) return { error: stageGateMessage(dict, gateFailure, stageRow.label) };

  const opportunity = await prisma.opportunity.create({
    data: {
      title: data.title,
      value: data.value,
      currency: data.currency,
      stage: data.stage,
      probability: data.probability,
      lostReason: data.stage === "LOST" ? data.lostReason || null : null,
      source: data.source || null,
      competitor: data.competitor || null,
      nextAction: data.nextAction || null,
      companyId: data.companyId || null,
      contactId: data.contactId,
      ownerId: resolveOwnerId(user, data.ownerId),
      visibility: resolveVisibility(user, data.visibility),
      createdById: user.id,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      closedAt: data.stage === "WON" || data.stage === "LOST" ? new Date() : null,
    },
  });

  revalidatePath("/opportunities");
  const returnTo = String(formData.get("returnTo") ?? "");
  const redirectTo = returnTo || `/opportunities/${opportunity.id}`;
  revalidatePath(redirectTo);
  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(`${redirectTo}${separator}flash=${encodeURIComponent(translateMessage(dict, "Opportunity created"))}`);
}

export async function updateOpportunity(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Opportunity not found") };
  // Editing (unlike viewing) always requires actually owning the deal, or being Admin/Management —
  // "visible to everyone" only ever grants read access.
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this opportunity") };
  }

  const parsed = opportunitySchema.safeParse(readOpportunityInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;
  const stageChanged = existing.stage !== data.stage;

  // A custom workflow step can only ever be used by the one Opportunity it was added to.
  const stageRow = await prisma.pipelineStage.findUnique({ where: { id: data.stage } });
  if (!stageRow || (stageRow.opportunityId !== null && stageRow.opportunityId !== id)) {
    return { error: translateMessage(dict, "Invalid stage") };
  }

  const gateFailure = stageGateCheck(data.stage, data.value, data.nextAction);
  if (gateFailure) return { error: stageGateMessage(dict, gateFailure, stageRow.label) };

  await prisma.opportunity.update({
    where: { id },
    data: {
      title: data.title,
      value: data.value,
      currency: data.currency,
      stage: data.stage,
      probability: data.probability,
      lostReason: data.stage === "LOST" ? data.lostReason || null : null,
      source: data.source || null,
      competitor: data.competitor || null,
      nextAction: data.nextAction || null,
      companyId: data.companyId || null,
      contactId: data.contactId,
      ownerId: resolveOwnerId(user, data.ownerId),
      visibility: resolveVisibility(user, data.visibility, existing.visibility),
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      closedAt:
        data.stage === "WON" || data.stage === "LOST"
          ? (existing.closedAt ?? new Date())
          : null,
      ...(stageChanged ? { stageChangedAt: new Date() } : {}),
    },
  });

  if (stageChanged) {
    await prisma.activity.create({
      data: {
        type: "STAGE_CHANGE",
        content: `Stage changed to: ${data.stage}`,
        userId: user.id,
        opportunityId: id,
      },
    });
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}?flash=${encodeURIComponent(translateMessage(dict, "Opportunity updated"))}`);
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
  /** Lets the board's Workflow popup supply the missing value/next action right when a gated move needs
   * one, instead of sending the user away to the Opportunity's own edit form and back. */
  gateFix?: { value?: number; nextAction?: string }
): Promise<{ error?: string }> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Opportunity not found") };
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this opportunity") };
  }
  const newStage = await prisma.pipelineStage.findUnique({ where: { id: stage } });
  if (!newStage || (newStage.opportunityId !== null && newStage.opportunityId !== id)) {
    return { error: translateMessage(dict, "Invalid stage") };
  }

  const value = gateFix?.value ?? existing.value;
  const nextAction = gateFix?.nextAction ?? existing.nextAction;
  const gateFailure = stageGateCheck(stage, value, nextAction);
  // Return the reason instead of throwing. A thrown Server Action is redacted in production and the
  // board only shows "Minified React error #441".
  if (gateFailure) return { error: stageGateMessage(dict, gateFailure, newStage.label) };

  await prisma.opportunity.update({
    where: { id },
    data: {
      stage,
      value,
      nextAction,
      probability: newStage.defaultProbability,
      closedAt: stage === "WON" || stage === "LOST" ? (existing.closedAt ?? new Date()) : null,
      stageChangedAt: new Date(),
    },
  });

  await prisma.activity.create({
    data: {
      type: "STAGE_CHANGE",
      content: `Stage changed to: ${stage}`,
      userId: user.id,
      opportunityId: id,
    },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  return {};
}

export async function deleteOpportunity(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing) return null;
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to delete this opportunity") };
  }

  try {
    await prisma.opportunity.delete({ where: { id } });
  } catch {
    return { error: translateMessage(dict, "This record is still linked to other data and can't be deleted") };
  }
  revalidatePath("/opportunities");
  redirect("/opportunities");
}
