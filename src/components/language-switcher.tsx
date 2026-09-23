"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import { useLocale, useDict } from "@/i18n/locale-context";
import type { Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const dict = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border border-border p-0.5 text-xs font-medium"
      aria-label={dict.language.label}
    >
      <Languages className="ms-1 hidden size-3.5 text-muted sm:block" />
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => switchTo(l)}
          className={cn(
            "rounded-lg px-1.5 py-1 transition-colors disabled:opacity-50 sm:px-2",
            locale === l ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground"
          )}
        >
          {dict.language[l]}
        </button>
      ))}
    </div>
  );
}
