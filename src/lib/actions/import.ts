"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { resolveOwnerId, visibleUserIds } from "@/lib/scope";
import { parseCsv } from "@/lib/csv";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";
import { getLocale } from "@/i18n/locale";
import { plural } from "@/i18n/plural";

export type ImportState = { error?: string; success?: string } | null;

export async function importContactsCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: translateMessage(dict, "Please choose a CSV file to import") };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { error: translateMessage(dict, "The file has no data rows") };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const nameIdx = col("name");
  if (nameIdx === -1) {
    return {
      error: translateMessage(
        dict,
        'The CSV needs a "Name" column. Export your contacts first to see the expected format.'
      ),
    };
  }
  const emailIdx = col("email");
  const phoneIdx = col("phone");
  const companyIdx = col("company");
  const statusIdx = col("status");
  const sourceIdx = col("source");
  const tagsIdx = col("tags");
  const dataRows = rows.slice(1);

  const visibleIds = await visibleUserIds(user);
  const existingContacts = await prisma.contact.findMany({
    where: { email: { not: null }, ...(visibleIds ? { ownerId: { in: visibleIds } } : {}) },
    select: { email: true },
  });
  const existingEmails = new Set(existingContacts.map((c) => c.email!.toLowerCase()));
  const companyCache = new Map<string, string>();

  let imported = 0;
  let skipped = 0;

  for (const cells of dataRows) {
    const name = cells[nameIdx]?.trim();
    const email = emailIdx >= 0 ? cells[emailIdx]?.trim() || "" : "";
    if (!name) {
      skipped++;
      continue;
    }
    if (email && existingEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }

    let companyId: string | null = null;
    const companyName = companyIdx >= 0 ? cells[companyIdx]?.trim() : "";
    if (companyName) {
      const cacheKey = companyName.toLowerCase();
      companyId = companyCache.get(cacheKey) ?? null;
      if (!companyId) {
        const existingCompany = await prisma.company.findFirst({ where: { name: companyName } });
        companyId = existingCompany
          ? existingCompany.id
          : (await prisma.company.create({ data: { name: companyName, ownerId: resolveOwnerId(user, user.id) } })).id;
        companyCache.set(cacheKey, companyId);
      }
    }

    const rawStatus = statusIdx >= 0 ? cells[statusIdx]?.trim().toUpperCase() : "";
    const status: ContactStatus = (CONTACT_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as ContactStatus)
      : "LEAD";
    const tagNames =
      tagsIdx >= 0
        ? Array.from(
            new Set(
              (cells[tagsIdx] ?? "")
                .split(/[;,]/)
                .map((t) => t.trim())
                .filter(Boolean)
            )
          )
        : [];

    await prisma.contact.create({
      data: {
        name,
        email: email || null,
        phone: phoneIdx >= 0 ? cells[phoneIdx]?.trim() || null : null,
        source: sourceIdx >= 0 ? cells[sourceIdx]?.trim() || null : null,
        status,
        companyId,
        ownerId: resolveOwnerId(user, user.id),
        tags: { connectOrCreate: tagNames.map((n) => ({ where: { name: n }, create: { name: n } })) },
      },
    });
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");
  const locale = await getLocale();
  const importedText = plural(locale, imported, dict.messages.importedContacts);
  const skippedText = skipped > 0 ? ` · ${plural(locale, skipped, dict.messages.importSkipped)}` : "";
  return { success: importedText + skippedText };
}
