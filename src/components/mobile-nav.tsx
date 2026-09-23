"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavItems, managementNavItems } from "@/lib/nav-items";
import { useDict } from "@/i18n/locale-context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Role } from "@/lib/validations";
import { BrandLogo } from "@/components/brand-logo";

function MobileNavLink({
  item,
  label,
  active,
  onNavigate,
}: {
  item: { href: string; icon: LucideIcon };
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          active ? "bg-primary/15 text-primary" : "text-muted"
        )}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

export function MobileNav({ role }: { role: Role }) {
  const dict = useDict();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visibleWorkspace = workspaceNavItems.filter((item) => (item.roles as readonly string[]).includes(role));
  const visibleManagement = managementNavItems.filter((item) => (item.roles as readonly string[]).includes(role));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const drawer = (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={dict.nav.section_workspace}
        className="fixed inset-0 z-[60] bg-[var(--ink)]/45"
        onClick={() => setOpen(false)}
      />
      <div className="animate-modal-in fixed inset-y-0 start-0 z-[70] flex w-[min(88vw,20.5rem)] flex-col border-e border-border bg-surface shadow-[var(--shadow-card-hover)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <BrandLogo alt={dict.brand.name} size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-10 items-center justify-center rounded-xl border border-border text-muted"
            aria-label={dict.nav.section_workspace}
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-muted/80 uppercase">
              {dict.nav.section_workspace}
            </div>
            {visibleWorkspace.map((item) => (
              <MobileNavLink
                key={item.href}
                item={item}
                label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
                active={isActive(item.href)}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>
          {visibleManagement.length > 0 ? (
            <div className="space-y-1 border-t border-border pt-4">
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-muted/80 uppercase">
                {dict.nav.section_management}
              </div>
              {visibleManagement.map((item) => (
                <MobileNavLink
                  key={item.href}
                  item={item}
                  label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
                  active={isActive(item.href)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-foreground md:hidden"
        aria-expanded={open}
        aria-label={dict.nav.section_workspace}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </button>
      {mounted && open ? createPortal(drawer, document.body) : null}
    </>
  );
}
