import Link from "next/link";
import { Menu, Search, Bell } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { SearchShortcut } from "@/components/search-shortcut";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Role } from "@/lib/validations";
import { MobileNav } from "@/components/mobile-nav";
import { prisma } from "@/lib/prisma";
import { ownedScope } from "@/lib/scope";
import { getLocale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { plural } from "@/i18n/plural";
import { roleLabel } from "@/i18n/enum-labels";

export async function Topbar({
  name,
  role,
  userId,
}: {
  name: string;
  role: Role;
  userId: string;
}) {
  const [overdueCount, locale] = await Promise.all([
    prisma.task.count({
      where: { ...(await ownedScope({ id: userId, role }, "assigneeId")), done: false, dueDate: { lt: new Date() } },
    }),
    getLocale(),
  ]);
  const dict = getDictionary(locale);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75 sm:px-4 md:gap-4 md:px-6 print:hidden">
      <div className="flex items-center gap-2 md:hidden">
        <details className="relative">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <Menu className="size-5" />
          </summary>
          <MobileNav role={role} />
        </details>
        <Link
          href="/search"
          className="flex size-10 items-center justify-center rounded-xl border border-border text-muted"
          aria-label={dict.topbar.search_placeholder}
        >
          <Search className="size-4" />
        </Link>
      </div>

      <form action="/search" method="get" className="hidden max-w-sm flex-1 md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 size-4 text-muted" />
          <input
            id="global-search"
            type="search"
            name="q"
            placeholder={dict.topbar.search_placeholder}
            className="w-full rounded-full border border-border bg-background px-3 py-2 ps-9 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <kbd className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted lg:block">
            /
          </kbd>
        </div>
      </form>
      <SearchShortcut />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <LanguageSwitcher />

        <Link
          href="/tasks"
          className="relative flex size-10 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          title={plural(locale, overdueCount, dict.topbar.overdue_tasks)}
        >
          <Bell className="size-4.5" />
          {overdueCount > 0 ? (
            <span className="absolute -top-1.5 -end-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {overdueCount > 99 ? "99+" : overdueCount}
            </span>
          ) : null}
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="hidden text-end sm:block">
            <div className="text-sm font-medium text-foreground">{name}</div>
            <div className="text-xs text-muted">{roleLabel(dict, role)}</div>
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {name.slice(0, 1)}
          </div>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
