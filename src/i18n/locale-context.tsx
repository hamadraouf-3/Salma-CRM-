"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./locale";
import type { Dictionary } from "./dictionaries";

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useDict must be used within <LocaleProvider>");
  return ctx;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useDict(): Dictionary {
  return useLocaleContext().dict;
}
