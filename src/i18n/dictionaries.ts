import "server-only";
import type { Locale } from "./locale";
import en from "./en.json";
import ar from "./ar.json";

const dictionaries = { en, ar };

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
