"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Settings, Users } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDict } from "@/i18n/locale-context";

export function AccountMenu({
  name,
  roleName,
  isAdmin,
}: {
  name: string;
  roleName: string;
  isAdmin: boolean;
}) {
  const dict = useDict();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-account-menu]")) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel = (
    <div
      data-account-menu
      className="animate-modal-in fixed top-[4.25rem] end-3 z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-card-hover)]"
    >
      <div className="border-b border-border px-3 py-2.5">
        <div className="truncate text-sm font-semibold text-foreground">{name}</div>
        <div className="text-xs text-muted">{roleName}</div>
      </div>
      <div className="mt-1 space-y-0.5">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-background"
        >
          <Settings className="size-4 text-muted" />
          {dict.topbar.settings}
        </Link>
        {isAdmin ? (
          <Link
            href="/users"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-background"
          >
            <Users className="size-4 text-muted" />
            {dict.nav.users}
          </Link>
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2 pt-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={dict.topbar.account_menu}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-background"
      >
        <List className="size-4" />
      </button>
      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}
