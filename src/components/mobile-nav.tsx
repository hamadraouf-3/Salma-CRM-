"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavItems, managementNavItems } from "@/lib/nav-items";
import { useDict } from "@/i18n/locale-context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Role } from "@/lib/validations";

function MobileNavLink({
  item,
  label,
  active,
}: {
  item: { href: string; icon: LucideIcon };
  label: string;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md",
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
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visibleWorkspace = workspaceNavItems.filter((item) => (item.roles as readonly string[]).includes(role));
  const visibleManagement = managementNavItems.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <div className="animate-modal-in absolute top-12 start-0 z-50 w-56 space-y-3 rounded-lg border border-border bg-surface p-2 shadow-[var(--shadow-card-hover)]">
      <div className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted/70 uppercase">
          {dict.nav.section_workspace}
        </div>
        {visibleWorkspace.map((item) => (
          <MobileNavLink
            key={item.href}
            item={item}
            label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
            active={isActive(item.href)}
          />
        ))}
      </div>
      {visibleManagement.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted/70 uppercase">
            {dict.nav.section_management}
          </div>
          {visibleManagement.map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
              active={isActive(item.href)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
