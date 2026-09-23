"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, resolveVisibility, canAccessOwner, ownedScope } from "@/lib/scope";
import { companySchema, contactSchema, opportunitySchema, requirementSchema, stageGateCheck } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage, stageGateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

export async function createSalesOpportunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  // --- Company: find-or-create (fully optional — an opportunity can have no account) ---
  const companyMode = String(formData.get("companyMode") ?? "new");
  const companyNameRaw = String(formData.get("companyName") ?? "").trim();
  let companyId: string | null = null;

  if (companyMode === "existing") {
    const id = String(formData.get("companyId") ?? "");
    if (!id) return { error: translateMessage(dict, "Select an existing company, or switch to creating a new one.") };
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing || !(await canAccessOwner(user, existing.ownerId))) {
      return { error: translateMessage(dict, "The selected company no longer exists.") };
    }
    companyId = existing.id;
  } else if (companyNameRaw) {
    // Safety net against the client's stale company list (e.g. two opportunities registered back to
    // back): re-check for a case-insensitive name match right before creating, and reuse it instead of
    // creating a duplicate Company row — scoped to what this user can see, so it can never silently
    // attach their new opportunity to another Account Manager's company.
    const existingByName = await prisma.company.findFirst({
      where: { name: { equals: companyNameRaw }, ...(await ownedScope(user)) },
    });
    if (existingByName) {
      companyId = existingByName.id;
    } else {
      const parsedCompany = companySchema.safeParse({
        name: String(formData.get("companyName") ?? ""),
        legalName: "",
        website: String(formData.get("companyWebsite") ?? ""),
        industry: String(formData.get("companyIndustry") ?? ""),
        companySize: String(formData.get("companySize") ?? ""),
        country: String(formData.get("companyCountry") ?? ""),
        city: String(formData.get("companyCity") ?? ""),
        phone: "",
        email: "",
        address: "",
        accountStatus: String(formData.get("companyAccountStatus") ?? "PROSPECT"),
        source: String(formData.get("companySource") ?? ""),
        notes: "",
        ownerId: String(formData.get("ownerId") ?? user.id),
      });
      if (!parsedCompany.success) {
        return { error: translateMessage(dict, parsedCompany.error.issues[0]?.message ?? "Invalid company data") };
      }
      const data = parsedCompany.data;
      const created = await prisma.company.create({
        data: {
          name: data.name,
          website: data.website || null,
          industry: data.industry || null,
          companySize: data.companySize || null,
          country: data.country || null,
          city: data.city || null,
          accountStatus: data.accountStatus,
          source: data.source || null,
          ownerId: resolveOwnerId(user, data.ownerId),
        },
      });
      companyId = created.id;
    }
  }

  // --- Contact: find-or-create (the only required part of this form) ---
  const contactMode = String(formData.get("contactMode") ?? "new");
  let contactId: string;
  let contactDisplayName: string;

  if (contactMode === "existing") {
    const id = String(formData.get("contactId") ?? "");
    if (!id) return { error: translateMessage(dict, "Select an existing contact, or switch to creating a new one.") };
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing || !(await canAccessOwner(user, existing.ownerId))) {
      return { error: translateMessage(dict, "The selected contact no longer exists.") };
    }
    contactId = existing.id;
    contactDisplayName = existing.name;
    if (!existing.companyId && companyId) {
      await prisma.contact.update({ where: { id: contactId }, data: { companyId } });
    }
  } else {
    const parsedContact = contactSchema.safeParse({
      name: String(formData.get("contactName") ?? ""),
      companyId: companyId ?? "",
      jobTitle: String(formData.get("contactJobTitle") ?? ""),
      department: String(formData.get("contactDepartment") ?? ""),
      email: String(formData.get("contactEmail") ?? ""),
      phone: String(formData.get("contactPhone") ?? ""),
      linkedIn: "",
      isDecisionMaker: formData.get("contactIsDecisionMaker") === "on",
      isPrimary: formData.get("contactIsPrimary") === "on",
      source: String(formData.get("companySource") ?? ""),
      preferredContactMethod: String(formData.get("contactPreferredMethod") ?? ""),
      status: "LEAD",
      notes: "",
      tags: "",
      ownerId: String(formData.get("ownerId") ?? user.id),
    });
    if (!parsedContact.success) {
      return { error: translateMessage(dict, parsedContact.error.issues[0]?.message ?? "Invalid contact data") };
    }
    const data = parsedContact.data;
    if (data.email) {
      const email = data.email.toLowerCase();
      const candidates = await prisma.contact.findMany({
        where: { email: { not: null }, ...(await ownedScope(user)) },
        select: { name: true, email: true },
      });
      const duplicate = candidates.find((c) => c.email?.toLowerCase() === email);
      if (duplicate) {
        return { error: dict.messages.duplicateContactEmail.replace("{name}", duplicate.name) };
      }
    }
    const created = await prisma.contact.create({
      data: {
        name: data.name,
        companyId: companyId,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
        email: data.email || null,
        phone: data.phone || null,
        isDecisionMaker: data.isDecisionMaker,
        isPrimary: data.isPrimary,
        source: data.source || null,
        preferredContactMethod: data.preferredContactMethod || null,
        status: "LEAD",
        ownerId: resolveOwnerId(user, data.ownerId),
      },
    });
    contactId = created.id;
    contactDisplayName = created.name;
  }

  // --- Opportunity (title is optional — falls back to the contact's name if left blank) ---
  const rawTitle = String(formData.get("opportunityTitle") ?? "").trim();
  const parsedOpportunity = opportunitySchema.safeParse({
    title: rawTitle || `${contactDisplayName} - Opportunity`,
    value: String(formData.get("opportunityValue") ?? "0"),
    currency: String(formData.get("opportunityCurrency") ?? ""),
    stage: String(formData.get("opportunityStage") ?? "NEW"),
    probability: String(formData.get("opportunityProbability") ?? "10"),
    lostReason: "",
    source: String(formData.get("opportunitySource") ?? ""),
    competitor: "",
    nextAction: String(formData.get("opportunityNextAction") ?? ""),
    notes: String(formData.get("opportunityNotes") ?? ""),
    priority: String(formData.get("opportunityPriority") ?? ""),
    opportunityType: String(formData.get("opportunityType") ?? ""),
    companyId: companyId ?? "",
    contactId,
    ownerId: String(formData.get("ownerId") ?? user.id),
    visibility: String(formData.get("opportunityVisibility") ?? ""),
    expectedCloseDate: String(formData.get("opportunityExpectedCloseDate") ?? ""),
  });
  if (!parsedOpportunity.success) {
    return { error: translateMessage(dict, parsedOpportunity.error.issues[0]?.message ?? "Invalid opportunity data") };
  }
  const opp = parsedOpportunity.data;

  const stageRow = await prisma.pipelineStage.findUnique({ where: { id: opp.stage } });
  if (!stageRow || stageRow.opportunityId !== null) {
    return { error: translateMessage(dict, "Invalid stage") };
  }

  const gateFailure = stageGateCheck(opp.stage, opp.value, opp.nextAction);
  if (gateFailure) return { error: stageGateMessage(dict, gateFailure, stageRow.label) };

  // --- Requirements (optional — only persisted if something was filled in) ---
  const requirementInput = {
    businessProblem: String(formData.get("reqBusinessProblem") ?? ""),
    customerObjective: String(formData.get("reqCustomerObjective") ?? ""),
    requiredSolution: String(formData.get("reqRequiredSolution") ?? ""),
    functionalRequirements: String(formData.get("reqFunctionalRequirements") ?? ""),
    technicalRequirements: String(formData.get("reqTechnicalRequirements") ?? ""),
    deployment: String(formData.get("reqDeployment") ?? ""),
    infrastructureNotes: String(formData.get("reqInfrastructureNotes") ?? ""),
  };
  const hasRequirementData = Object.values(requirementInput).some((v) => v !== "");
  let parsedRequirement: ReturnType<typeof requirementSchema.safeParse> | null = null;
  if (hasRequirementData) {
    parsedRequirement = requirementSchema.safeParse(requirementInput);
    if (!parsedRequirement.success) {
      return { error: translateMessage(dict, parsedRequirement.error.issues[0]?.message ?? "Invalid requirements data") };
    }
  }

  // --- Initial activity / follow-up (optional) ---
  const activityContent = String(formData.get("activityContent") ?? "").trim();
  const activityType = String(formData.get("activityType") ?? "NOTE");

  // --- Initial task / next follow-up (optional) ---
  const taskTitle = String(formData.get("taskTitle") ?? "").trim();
  const taskDueDate = String(formData.get("taskDueDate") ?? "");

  const opportunity = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunity.create({
      data: {
        title: opp.title,
        value: opp.value,
        currency: opp.currency,
        stage: opp.stage,
        probability: opp.probability,
        source: opp.source || null,
        nextAction: opp.nextAction || null,
        notes: opp.notes || null,
        priority: opp.priority || null,
        opportunityType: opp.opportunityType || null,
        companyId: opp.companyId || null,
        contactId: opp.contactId,
        ownerId: resolveOwnerId(user, opp.ownerId),
        visibility: resolveVisibility(user, opp.visibility),
        createdById: user.id,
        expectedCloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null,
        closedAt: opp.stage === "WON" || opp.stage === "LOST" ? new Date() : null,
      },
    });

    if (parsedRequirement?.success) {
      const r = parsedRequirement.data;
      await tx.requirement.create({
        data: {
          opportunityId: created.id,
          businessProblem: r.businessProblem || null,
          customerObjective: r.customerObjective || null,
          requiredSolution: r.requiredSolution || null,
          functionalRequirements: r.functionalRequirements || null,
          technicalRequirements: r.technicalRequirements || null,
          deployment: r.deployment || null,
          infrastructureNotes: r.infrastructureNotes || null,
        },
      });
    }

    if (activityContent) {
      await tx.activity.create({
        data: {
          type: activityType,
          content: activityContent,
          userId: user.id,
          opportunityId: created.id,
          contactId,
          companyId: companyId ?? null,
        },
      });
    }

    if (taskTitle) {
      await tx.task.create({
        data: {
          title: taskTitle,
          dueDate: taskDueDate ? new Date(taskDueDate) : null,
          priority: "MEDIUM",
          assigneeId: resolveOwnerId(user, opp.ownerId),
          opportunityId: created.id,
          contactId,
          companyId: companyId ?? null,
        },
      });
    }

    return created;
  });

  redirect(`/opportunities/${opportunity.id}?flash=${encodeURIComponent(translateMessage(dict, "Sales opportunity created"))}`);
}
