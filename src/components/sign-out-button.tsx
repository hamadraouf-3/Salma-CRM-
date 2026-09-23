"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useDict } from "@/i18n/locale-context";

export function SignOutButton() {
  const dict = useDict();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex size-10 items-center justify-center gap-2 rounded-xl px-2 text-sm text-muted transition-colors hover:bg-background hover:text-foreground sm:w-auto sm:px-3"
      aria-label={dict.topbar.sign_out}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{dict.topbar.sign_out}</span>
    </button>
  );
}
