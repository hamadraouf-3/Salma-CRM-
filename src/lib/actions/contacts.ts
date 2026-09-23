"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, canAccessOwner, visibleUserIds } from "@/lib/scope";
import { contactSchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readContactInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    companyId: String(formData.get("companyId") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    department: String(formData.get("department") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    linkedIn: String(formData.get("linkedIn") ?? ""),
    isDecisionMaker: formData.get("isDecisionMaker") === "on",
    isPrimary: formData.get("isPrimary") === "on",
    source: String(formData.get("source") ?? ""),
    status: String(formData.get("status") ?? "LEAD"),
    notes: String(formData.get("notes") ?? ""),
    tags: String(formData.get("tags") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
  };
}

function parseTagNames(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

export async function createContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const parsed = contactSchema.safeParse(readContactInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }

  const data = parsed.data;
  const tagNames = parseTagNames(data.tags ?? "");

  if (data.email) {
    // SQLite has no case-insensitive `mode` filter, so compare in JS instead.
    const email = data.email.toLowerCase();
    const visibleIds = await visibleUserIds(user);
    const candidates = await prisma.contact.findMany({
      where: { email: { not: null }, ...(visibleIds ? { ownerId: { in: visibleIds } } : {}) },
      select: { name: true, email: true },
    });
    const duplicate = candidates.find((c) => c.email?.toLowerCase() === email);
    if (duplicate) {
      return { error: dict.messages.duplicateContactEmail.replace("{name}", duplicate.name) };
    }
  }

  const contact = await prisma.contact.create({
    data: {
      name: data.name,
      companyId: data.companyId || null,
      jobTitle: data.jobTitle || null,
      department: data.department || null,
      email: data.email || null,
      phone: data.phone || null,
      linkedIn: data.linkedIn || null,
      isDecisionMaker: data.isDecisionMaker,
      isPrimary: data.isPrimary,
      source: data.source || null,
      status: data.status,
      notes: data.notes || null,
      ownerId: resolveOwnerId(user, data.ownerId),
      tags: {
        connectOrCreate: tagNames.map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });

  revalidatePath("/contacts");
  const returnTo = String(formData.get("returnTo") ?? "");
  const redirectTo = returnTo || `/contacts/${contact.id}`;
  revalidatePath(redirectTo);
  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(`${redirectTo}${separator}flash=${encodeURIComponent(translateMessage(dict, "Contact created"))}`);
}

export async function updateContact(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Contact not found") };
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this contact") };
  }

  const parsed = contactSchema.safeParse(readContactInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }

  const data = parsed.data;
  const tagNames = parseTagNames(data.tags ?? "");

  await prisma.contact.update({
    where: { id },
    data: {
      name: data.name,
      companyId: data.companyId || null,
      jobTitle: data.jobTitle || null,
      department: data.department || null,
      email: data.email || null,
      phone: data.phone || null,
      linkedIn: data.linkedIn || null,
      isDecisionMaker: data.isDecisionMaker,
      isPrimary: data.isPrimary,
      source: data.source || null,
      status: data.status,
      notes: data.notes || null,
      ownerId: resolveOwnerId(user, data.ownerId),
      tags: {
        set: [],
        connectOrCreate: tagNames.map((name) => ({ where: { name }, create: { name } })),
      },
    },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}?flash=${encodeURIComponent(translateMessage(dict, "Contact updated"))}`);
}

export async function deleteContact(id: string): Promise<void> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await canAccessOwner(user, existing.ownerId))) {
    throw new Error(translateMessage(dict, "You do not have permission to delete this contact"));
  }

  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  redirect("/contacts");
}
