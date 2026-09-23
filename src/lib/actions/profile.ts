"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

export type ActionState = { error?: string; success?: string } | null;

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActionUser();
  const dict = await getServerDict();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: translateMessage(dict, "User not found") };

  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) return { error: translateMessage(dict, "Current password is incorrect") };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: translateMessage(dict, "Password updated") };
}
