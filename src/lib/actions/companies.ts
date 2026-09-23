"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, canAccessOwner } from "@/lib/scope";
import { companySchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readCompanyInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    website: String(formData.get("website") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    companySize: String(formData.get("companySize") ?? ""),
    country: String(formData.get("country") ?? ""),
    city: String(formData.get("city") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    accountStatus: String(formData.get("accountStatus") ?? "PROSPECT"),
    source: String(formData.get("source") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
  };
}

export async function createCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const parsed = companySchema.safeParse(readCompanyInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  const company = await prisma.company.create({
    data: {
      name: data.name,
      legalName: data.legalName || null,
      website: data.website || null,
      industry: data.industry || null,
      companySize: data.companySize || null,
      country: data.country || null,
      city: data.city || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      accountStatus: data.accountStatus,
      source: data.source || null,
      notes: data.notes || null,
      ownerId: resolveOwnerId(user, data.ownerId),
    },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}?flash=${encodeURIComponent(translateMessage(dict, "Company created"))}`);
}

export async function updateCompany(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Company not found") };
  if (!(await canAccessOwner(user, existing.ownerId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this company") };
  }

  const parsed = companySchema.safeParse(readCompanyInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      legalName: data.legalName || null,
      website: data.website || null,
      industry: data.industry || null,
      companySize: data.companySize || null,
      country: data.country || null,
      city: data.city || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      accountStatus: data.accountStatus,
      source: data.source || null,
      notes: data.notes || null,
      ownerId: resolveOwnerId(user, data.ownerId),
    },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}?flash=${encodeURIComponent(translateMessage(dict, "Company updated"))}`);
}

export async function deleteCompany(id: string): Promise<void> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await canAccessOwner(user, existing.ownerId))) {
    throw new Error(translateMessage(dict, "You do not have permission to delete this company"));
  }

  await prisma.company.delete({ where: { id } });
  revalidatePath("/companies");
  redirect("/companies");
}
