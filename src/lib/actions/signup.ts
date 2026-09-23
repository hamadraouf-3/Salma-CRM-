"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerDict } from "@/i18n/server-dict";
import { translateMessage } from "@/i18n/messages";

const signUpSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
});

export async function signUp(_prev: { error?: string } | null, formData: FormData) {
  const dict = await getServerDict();
  const parsed = signUpSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: translateMessage(dict, parsed.error.issues[0]?.message ?? "Invalid data") };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: translateMessage(dict, "Passwords do not match") };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: translateMessage(dict, "This email is already in use") };

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "ACCOUNT_MANAGER",
      active: true,
    },
  });

  return null;
}
