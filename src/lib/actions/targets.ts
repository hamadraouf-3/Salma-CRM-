"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { salesTargetSchema, targetStatusSchema } from "@/lib/validations";
import { computePeriodRange } from "@/lib/targets";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

function readTargetInput(formData: FormData) {
  return {
    userId: String(formData.get("userId") ?? ""),
    targetType: String(formData.get("targetType") ?? "REVENUE"),
    periodType: String(formData.get("periodType") ?? "MONTHLY"),
    year: String(formData.get("year") ?? ""),
    periodNumber: String(formData.get("periodNumber") ?? "1"),
    targetValue: String(formData.get("targetValue") ?? "0"),
    currency: String(formData.get("currency") ?? ""),
  };
}

/** Only ADMIN may create a target — it is assigned to an Account Manager, never self-service. */
export async function createTarget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireActionUser("ADMIN");
  const dict = await getServerDict();

  const parsed = salesTargetSchema.safeParse(readTargetInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;
  const { start, end } = computePeriodRange(data.periodType, data.year, data.periodNumber);

  try {
    const target = await prisma.salesTarget.create({
      data: {
        userId: data.userId,
        targetType: data.targetType,
        periodType: data.periodType,
        periodStart: start,
        periodEnd: end,
        targetValue: data.targetValue,
        currency: data.currency,
        status: "ACTIVE",
        createdById: admin.id,
      },
    });
    await prisma.salesTargetAudit.create({
      data: {
        targetId: target.id,
        actorId: admin.id,
        action: "CREATED",
        newValue: String(data.targetValue),
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { error: translateMessage(dict, "A target already exists for this Account Manager, type, and period") };
    }
    throw err;
  }

  revalidatePath("/targets");
  revalidatePath("/");
  redirect(`/targets?flash=${encodeURIComponent(translateMessage(dict, "Target created"))}`);
}

/** Only ADMIN may edit a target's value/period — the owning Account Manager never can. */
export async function updateTarget(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireActionUser("ADMIN");
  const dict = await getServerDict();

  const existing = await prisma.salesTarget.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Target not found") };

  const parsed = salesTargetSchema.safeParse(readTargetInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;
  const { start, end } = computePeriodRange(data.periodType, data.year, data.periodNumber);

  try {
    await prisma.salesTarget.update({
      where: { id },
      data: {
        userId: data.userId,
        targetType: data.targetType,
        periodType: data.periodType,
        periodStart: start,
        periodEnd: end,
        targetValue: data.targetValue,
        currency: data.currency,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { error: translateMessage(dict, "A target already exists for this Account Manager, type, and period") };
    }
    throw err;
  }

  const auditEntries: { field: string; previousValue: string; newValue: string }[] = [];
  if (existing.targetValue !== data.targetValue) {
    auditEntries.push({ field: "targetValue", previousValue: String(existing.targetValue), newValue: String(data.targetValue) });
  }
  if (existing.periodStart.getTime() !== start.getTime() || existing.periodEnd.getTime() !== end.getTime()) {
    auditEntries.push({ field: "period", previousValue: existing.periodStart.toISOString(), newValue: start.toISOString() });
  }
  if (existing.userId !== data.userId) {
    auditEntries.push({ field: "userId", previousValue: existing.userId, newValue: data.userId });
  }
  if (auditEntries.length > 0) {
    await prisma.salesTargetAudit.createMany({
      data: auditEntries.map((entry) => ({
        targetId: id,
        actorId: admin.id,
        action: "UPDATED",
        field: entry.field,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
      })),
    });
  }

  revalidatePath("/targets");
  revalidatePath("/");
  redirect(`/targets?flash=${encodeURIComponent(translateMessage(dict, "Target updated"))}`);
}

/** Only ADMIN may change a target's status (e.g. archiving it) — never the Account Manager it belongs to. */
export async function setTargetStatus(id: string, formData: FormData): Promise<void> {
  const admin = await requireActionUser("ADMIN");
  const dict = await getServerDict();

  const existing = await prisma.salesTarget.findUnique({ where: { id } });
  if (!existing) throw new Error(translateMessage(dict, "Target not found"));

  const parsed = targetStatusSchema.safeParse({ status: String(formData.get("status") ?? "") });
  if (!parsed.success) {
    throw new Error(translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data"));
  }

  await prisma.salesTarget.update({ where: { id }, data: { status: parsed.data.status } });
  if (existing.status !== parsed.data.status) {
    await prisma.salesTargetAudit.create({
      data: {
        targetId: id,
        actorId: admin.id,
        action: "STATUS_CHANGED",
        field: "status",
        previousValue: existing.status,
        newValue: parsed.data.status,
      },
    });
  }

  revalidatePath("/targets");
  revalidatePath("/");
}

/** Only ADMIN may permanently delete a target — its audit trail is deleted along with it (cascade). */
export async function deleteTarget(id: string): Promise<void> {
  await requireActionUser("ADMIN");
  const dict = await getServerDict();

  const existing = await prisma.salesTarget.findUnique({ where: { id } });
  if (!existing) throw new Error(translateMessage(dict, "Target not found"));

  await prisma.salesTarget.delete({ where: { id } });

  revalidatePath("/targets");
  revalidatePath("/");
}
