"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { activitySchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

export async function addActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  const parsed = activitySchema.safeParse({
    type: String(formData.get("type") ?? "NOTE"),
    content: String(formData.get("content") ?? ""),
    remindAt: String(formData.get("remindAt") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    companyId: String(formData.get("companyId") ?? ""),
    contactId: String(formData.get("contactId") ?? ""),
    opportunityId: String(formData.get("opportunityId") ?? ""),
  });
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  const links = {
    leadId: data.leadId || null,
    companyId: data.companyId || null,
    contactId: data.contactId || null,
    opportunityId: data.opportunityId || null,
  };

  const needsReminder = (data.type === "MEETING" || data.type === "FOLLOW_UP") && data.remindAt;

  await prisma.$transaction(async (tx) => {
    await tx.activity.create({
      data: { type: data.type, content: data.content, userId: user.id, ...links },
    });

    if (needsReminder) {
      const label = data.type === "MEETING" ? "Meeting" : "Follow up";
      const title = data.content.length > 60 ? `${label}: ${data.content.slice(0, 60)}…` : `${label}: ${data.content}`;
      await tx.task.create({
        data: {
          title,
          dueDate: new Date(data.remindAt!),
          priority: "MEDIUM",
          assigneeId: user.id,
          ...links,
        },
      });
    }
  });

  if (data.leadId) {
    await prisma.lead.update({ where: { id: data.leadId }, data: { lastActivityAt: new Date() } });
    revalidatePath(`/leads/${data.leadId}`);
  }
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);
  if (data.opportunityId) revalidatePath(`/opportunities/${data.opportunityId}`);
  return null;
}
