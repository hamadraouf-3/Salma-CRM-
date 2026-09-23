"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useDict } from "@/i18n/locale-context";

export function SignOutButton() {
  const dict = useDict();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-2.5 text-sm font-medium text-foreground transition-colors hover:border-danger/40 hover:bg-danger-bg hover:text-danger sm:px-3"
      aria-label={dict.topbar.sign_out}
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{dict.topbar.sign_out}</span>
    </button>
  );
}
