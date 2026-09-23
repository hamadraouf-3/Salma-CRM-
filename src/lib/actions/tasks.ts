"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { canAccessOwner } from "@/lib/scope";
import { taskSchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readTaskInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    type: String(formData.get("type") ?? "OTHER"),
    assigneeId: String(formData.get("assigneeId") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    companyId: String(formData.get("companyId") ?? ""),
    contactId: String(formData.get("contactId") ?? ""),
    opportunityId: String(formData.get("opportunityId") ?? ""),
  };
}

function resolveAssigneeId(user: { id: string; role: string }, requested: string) {
  if (user.role !== "ADMIN") return user.id;
  return requested || user.id;
}

function redirectTargetFor(data: { opportunityId?: string; contactId?: string; companyId?: string; leadId?: string }) {
  if (data.opportunityId) return `/opportunities/${data.opportunityId}`;
  if (data.contactId) return `/contacts/${data.contactId}`;
  if (data.companyId) return `/companies/${data.companyId}`;
  if (data.leadId) return `/leads/${data.leadId}`;
  return "/tasks";
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const parsed = taskSchema.safeParse(readTaskInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;
  const redirectTo = redirectTargetFor(data);

  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      type: data.type,
      assigneeId: resolveAssigneeId(user, data.assigneeId),
      leadId: data.leadId || null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      opportunityId: data.opportunityId || null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(redirectTo);
  const separator = redirectTo.includes("?") ? "&" : "?";
  redirect(`${redirectTo}${separator}flash=${encodeURIComponent(translateMessage(dict, "Task created"))}`);
}

export async function updateTask(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Task not found") };
  if (!(await canAccessOwner(user, existing.assigneeId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this task") };
  }

  const parsed = taskSchema.safeParse(readTaskInput(formData));
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  const data = parsed.data;

  await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      type: data.type,
      assigneeId: resolveAssigneeId(user, data.assigneeId),
      leadId: data.leadId || null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      opportunityId: data.opportunityId || null,
    },
  });

  revalidatePath("/tasks");
  redirect(`/tasks?flash=${encodeURIComponent(translateMessage(dict, "Task updated"))}`);
}

export async function toggleTaskDone(
  id: string,
  done: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return { error: translateMessage(dict, "Task not found") };
  if (!(await canAccessOwner(user, existing.assigneeId))) {
    return { error: translateMessage(dict, "You do not have permission to edit this task") };
  }

  await prisma.task.update({ where: { id }, data: { done } });
  revalidatePath("/tasks");
  if (existing.opportunityId) revalidatePath(`/opportunities/${existing.opportunityId}`);
  if (existing.contactId) revalidatePath(`/contacts/${existing.contactId}`);
  if (existing.companyId) revalidatePath(`/companies/${existing.companyId}`);
  if (existing.leadId) revalidatePath(`/leads/${existing.leadId}`);
  return null;
}

export async function deleteTask(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return null;
  if (!(await canAccessOwner(user, existing.assigneeId))) {
    return { error: translateMessage(dict, "You do not have permission to delete this task") };
  }

  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
  return null;
}
