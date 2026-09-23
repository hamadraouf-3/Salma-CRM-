"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceNavItems, managementNavItems } from "@/lib/nav-items";
import { useDict } from "@/i18n/locale-context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Role } from "@/lib/validations";

function NavLink({
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-foreground"
      )}
    >
      {active ? <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-primary" /> : null}
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          active ? "bg-primary/15 text-primary" : "text-muted group-hover:text-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </Link>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const dict = useDict();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visibleManagement = managementNavItems.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-surface md:flex print:hidden">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Image src="/logo.png" alt={dict.brand.name} width={450} height={137} className="h-8 w-auto" priority />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
            {dict.nav.section_workspace}
          </div>
          {workspaceNavItems
            .filter((item) => (item.roles as readonly string[]).includes(role))
            .map((item) => (
              <NavLink
                key={item.href}
                item={item}
                label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
                active={isActive(item.href)}
              />
            ))}
        </div>

        {visibleManagement.length > 0 ? (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              {dict.nav.section_management}
            </div>
            {visibleManagement.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                label={dict.nav[item.labelKey as keyof Dictionary["nav"]]}
                active={isActive(item.href)}
              />
            ))}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
