"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { userSchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string } | null;

function readUserInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "ACCOUNT_MANAGER"),
    title: String(formData.get("title") ?? ""),
    active: formData.get("active") === "on",
  };
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActionUser("ADMIN");
  const dict = await getServerDict();
  const input = readUserInput(formData);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  if (!parsed.data.password) {
    return { error: translateMessage(dict, "Password is required when creating a new user") };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: translateMessage(dict, "This email is already in use") };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      title: parsed.data.title || null,
      active: parsed.data.active,
    },
  });

  revalidatePath("/users");
  redirect(`/users?flash=${encodeURIComponent(translateMessage(dict, "User created"))}`);
}

export async function updateUser(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireActionUser("ADMIN");
  const dict = await getServerDict();
  const input = readUserInput(formData);
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (conflict) return { error: translateMessage(dict, "This email is already in use") };

  await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      title: parsed.data.title || null,
      active: parsed.data.active,
      ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) } : {}),
    },
  });

  revalidatePath("/users");
  redirect(`/users?flash=${encodeURIComponent(translateMessage(dict, "User updated"))}`);
}

export async function toggleUserActive(
  id: string,
  active: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const admin = await requireActionUser("ADMIN");
  if (admin.id === id && !active) {
    const dict = await getServerDict();
    return { error: translateMessage(dict, "You cannot deactivate your own account") };
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/users");
  return null;
}
