"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useDict } from "@/i18n/locale-context";

export function SignOutButton() {
  const dict = useDict();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground transition-colors"
    >
      <LogOut className="size-4" />
      {dict.topbar.sign_out}
    </button>
  );
}
