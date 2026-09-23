"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDict } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

export function Pagination(props: { total: number; pageSize: number; currentPage: number }) {
  return (
    <Suspense fallback={null}>
      <PaginationInner {...props} />
    </Suspense>
  );
}

function PaginationInner({
  total,
  pageSize,
  currentPage,
}: {
  total: number;
  pageSize: number;
  currentPage: number;
}) {
  const dict = useDict();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const navButtonClasses =
    "flex size-8 items-center justify-center rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
      <span>
        {dict.common.showingRange
          .replace("{start}", String(start))
          .replace("{end}", String(end))
          .replace("{total}", String(total))}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage <= 1}
          className={cn(navButtonClasses, currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:border-primary hover:bg-background hover:text-primary")}
        >
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </Link>
        <span className="px-2 font-medium text-foreground tabular-nums">
          {dict.common.pageOf.replace("{current}", String(currentPage)).replace("{total}", String(totalPages))}
        </span>
        <Link
          href={hrefFor(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage >= totalPages}
          className={cn(navButtonClasses, currentPage >= totalPages ? "pointer-events-none opacity-40" : "hover:border-primary hover:bg-background hover:text-primary")}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}
