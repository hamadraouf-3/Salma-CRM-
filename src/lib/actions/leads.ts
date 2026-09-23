"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, canAccessOwner } from "@/lib/scope";
import { leadSchema, SYSTEM_STAGE_DEFAULT_PROBABILITY } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readLeadInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    source: String(formData.get("source") ?? ""),
    status: String(formData.get("status") ?? "NEW"),
    score: String(formData.get("score") ?? "0"),
    notes: String(formData.get("notes") ?? ""),
    nextFollowUpAt: String(formData.get("nextFollowUpAt") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
  };
}

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const parsed = leadSchema.safeParse(readLeadInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      companyName: data.companyName || null,
      jobTitle: data.jobTitle || null,
      email: data.email || null,
      phone: data.phone || null,
      industry: data.industry || null,
      source: data.source || null,
      status: data.status,
      score: data.score,
      notes: data.notes || null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      ownerId: resolveOwnerId(user, data.ownerId),
    },
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}?flash=${encodeURIComponent(translateMessage(dict, "Lead created"))}`);
}

export async function updateLead(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Lead not found") };
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this lead") };
  }
  if (existing.status === "CONVERTED") {
    return { error: translateMessage(dict, "This lead has already been converted and can no longer be edited") };
  }

  const parsed = leadSchema.safeParse(readLeadInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  await prisma.lead.update({
    where: { id },
    data: {
      name: data.name,
      companyName: data.companyName || null,
      jobTitle: data.jobTitle || null,
      email: data.email || null,
      phone: data.phone || null,
      industry: data.industry || null,
      source: data.source || null,
      status: data.status,
      score: data.score,
      notes: data.notes || null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      ownerId: resolveOwnerId(user, data.ownerId),
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}?flash=${encodeURIComponent(translateMessage(dict, "Lead updated"))}`);
}

export async function deleteLead(id: string): Promise<void> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await canAccessOwner(user, existing.ownerId))) {
    throw new Error(translateMessage(dict, "You do not have permission to delete this lead"));
  }

  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  redirect("/leads");
}

/**
 * Converts a qualified Lead into a Company + Contact + Opportunity.
 * Reuses an existing Company (exact name match) or Contact (exact email match)
 * instead of creating duplicates, and keeps the Lead row for history.
 */
export async function convertLead(id: string): Promise<void> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error(translateMessage(dict, "Lead not found"));
  if (!(await canAccessOwner(user, lead.ownerId))) {
    throw new Error(translateMessage(dict, "You do not have permission to convert this lead"));
  }
  if (lead.status === "CONVERTED") {
    throw new Error(translateMessage(dict, "This lead has already been converted"));
  }

  const ownerId = resolveOwnerId(user, lead.ownerId);

  let companyId: string | null = null;
  if (lead.companyName) {
    const existingCompany = await prisma.company.findFirst({
      where: { name: { equals: lead.companyName } },
    });
    companyId = existingCompany
      ? existingCompany.id
      : (
          await prisma.company.create({
            data: { name: lead.companyName, source: lead.source, industry: lead.industry, ownerId },
          })
        ).id;
  }

  let contactId: string;
  const existingContact = lead.email
    ? await prisma.contact.findFirst({ where: { email: { equals: lead.email } } })
    : null;
  if (existingContact) {
    contactId = existingContact.id;
    if (companyId && !existingContact.companyId) {
      await prisma.contact.update({ where: { id: contactId }, data: { companyId } });
    }
  } else {
    const contact = await prisma.contact.create({
      data: {
        name: lead.name,
        jobTitle: lead.jobTitle,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: "QUALIFIED",
        companyId,
        ownerId,
      },
    });
    contactId = contact.id;
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      title: lead.companyName ? `${lead.companyName} — New Opportunity` : `${lead.name} — New Opportunity`,
      companyId,
      contactId,
      ownerId,
      createdById: user.id,
      source: lead.source,
      stage: "NEW",
      probability: SYSTEM_STAGE_DEFAULT_PROBABILITY.NEW,
    },
  });

  await prisma.lead.update({
    where: { id },
    data: {
      status: "CONVERTED",
      convertedAt: new Date(),
      convertedAccountId: companyId,
      convertedContactId: contactId,
      convertedOpportunityId: opportunity.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: "NOTE",
      content: "Lead converted into a Company, Contact, and Opportunity",
      userId: user.id,
      leadId: id,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}?flash=${encodeURIComponent(translateMessage(dict, "Lead converted successfully"))}`);
}
