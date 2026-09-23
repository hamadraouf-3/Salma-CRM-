"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { canAccessOwner } from "@/lib/scope";
import { requirementSchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readRequirementInput(formData: FormData) {
  return {
    businessProblem: String(formData.get("businessProblem") ?? ""),
    customerObjective: String(formData.get("customerObjective") ?? ""),
    requiredSolution: String(formData.get("requiredSolution") ?? ""),
    functionalRequirements: String(formData.get("functionalRequirements") ?? ""),
    technicalRequirements: String(formData.get("technicalRequirements") ?? ""),
    deployment: String(formData.get("deployment") ?? ""),
    infrastructureNotes: String(formData.get("infrastructureNotes") ?? ""),
  };
}

export async function upsertRequirement(
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

  const parsed = requirementSchema.safeParse(readRequirementInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  const values = {
    businessProblem: data.businessProblem || null,
    customerObjective: data.customerObjective || null,
    requiredSolution: data.requiredSolution || null,
    functionalRequirements: data.functionalRequirements || null,
    technicalRequirements: data.technicalRequirements || null,
    deployment: data.deployment || null,
    infrastructureNotes: data.infrastructureNotes || null,
  };

  await prisma.requirement.upsert({
    where: { opportunityId },
    create: { opportunityId, ...values },
    update: values,
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  return null;
}
